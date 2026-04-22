import Anthropic from "@anthropic-ai/sdk";
import type { Intent, Policy, ProposedAction, RiskExplanation } from "@deadhand/types";
import {
  createPolicyRequestSchema,
  intentSchema,
  proposedActionSchema,
  riskExplanationSchema
} from "@deadhand/types";
import { env } from "../../config/env.js";
import { HttpError } from "../../lib/httpError.js";
import type { AIProvider, PlannerContext } from "./types.js";

type AnthropicTextResponse = {
  content?: Array<{ type: string; text?: string }>;
};

type AnthropicClientLike = {
  messages: {
    create(input: {
      model: string;
      max_tokens: number;
      temperature: number;
      system: string;
      messages: Array<{ role: "user"; content: string }>;
    }): Promise<AnthropicTextResponse>;
  };
};

function extractText(response: AnthropicTextResponse): string {
  const text = (response.content ?? [])
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new HttpError(502, "Anthropic returned no text content");
  }

  return text;
}

function parseJsonResponse<T>(text: string): T {
  const trimmed = text.trim();
  const unfenced = trimmed
    .replace(/^```[a-zA-Z0-9_-]*\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(unfenced) as T;
  } catch {
    const objectStart = unfenced.indexOf("{");
    const objectEnd = unfenced.lastIndexOf("}");
    const arrayStart = unfenced.indexOf("[");
    const arrayEnd = unfenced.lastIndexOf("]");

    const objectCandidate =
      objectStart !== -1 && objectEnd > objectStart ? unfenced.slice(objectStart, objectEnd + 1) : null;
    const arrayCandidate =
      arrayStart !== -1 && arrayEnd > arrayStart ? unfenced.slice(arrayStart, arrayEnd + 1) : null;

    if (objectCandidate && (!arrayCandidate || objectStart < arrayStart)) {
      return JSON.parse(objectCandidate) as T;
    }

    if (arrayCandidate) {
      return JSON.parse(arrayCandidate) as T;
    }

    throw new Error(`Anthropic did not return parsable JSON: ${trimmed.slice(0, 160)}`);
  }
}

function compactPolicySummary(policy: Policy) {
  return {
    approvalThresholdBnb: policy.approvalThresholdBnb,
    maxTransactionBnb: policy.maxTransactionBnb,
    maxDailySpendBnb: policy.maxDailySpendBnb,
    maxSlippageBps: policy.maxSlippageBps,
    allowedActionTypes: policy.allowedActionTypes,
    allowedContractAddresses: policy.allowedContractAddresses,
    blockedContractAddresses: policy.blockedContractAddresses,
    simulationRequired: policy.simulationRequired
  };
}

function compactIntentPromptShape() {
  return {
    goalType: "BUY | SELL | TRANSFER | ADD_LIQUIDITY | LAUNCH_SUPPORT",
    targetTokenAddress: "0x... | null",
    targetTokenSymbol: "string | null",
    totalBudgetBnb: "string | null",
    operationType: "SINGLE | MULTI_STEP",
    constraints: ["string"],
    clarificationNeeded: "boolean",
    clarificationQuestion: "string | null"
  };
}

function normalizeIntentResponse(goal: string, value: Intent | Record<string, unknown>) {
  const explicitAddress = goal.match(/0x[a-fA-F0-9]{40}/)?.[0] ?? null;
  const normalized = {
    ...value,
    goalType:
      value.goalType === "SWAP"
        ? "BUY"
        : value.goalType === "SEND"
          ? "TRANSFER"
          : value.goalType,
    targetTokenAddress: explicitAddress ? value.targetTokenAddress : null
  };

  return normalized;
}

function normalizeRiskExplanationResponse(
  value: RiskExplanation | Record<string, unknown>,
  fallbackRiskLevel: "BLOCKED" | "HIGH" | "LOW"
) {
  if (typeof value === "string") {
    return {
      explanation: value,
      riskLevel: fallbackRiskLevel
    };
  }

  const candidate = value as Record<string, unknown>;
  return {
    explanation:
      typeof candidate.explanation === "string"
        ? candidate.explanation
        : typeof candidate.riskExplanation === "string"
          ? candidate.riskExplanation
          : "Risk explanation unavailable.",
    riskLevel:
      candidate.riskLevel === "LOW" || candidate.riskLevel === "HIGH" || candidate.riskLevel === "BLOCKED"
        ? candidate.riskLevel
        : fallbackRiskLevel
  };
}

function compactPolicyTranslationShape() {
  return {
    approvalThresholdBnb: "string?",
    maxTransactionBnb: "string?",
    maxDailySpendBnb: "string?",
    maxSlippageBps: "number?",
    allowedTokenAddresses: ["0x..."],
    blockedTokenAddresses: ["0x..."],
    allowedContractAddresses: ["0x..."],
    blockedContractAddresses: ["0x..."],
    allowedActionTypes: ["BUY_TOKEN | FOUR_MEME_BUY | ..."],
    blockedActionTypes: ["..."],
    simulationRequired: "boolean?"
  };
}

function assertAllowedContractTargets(actions: ProposedAction[], context: PlannerContext) {
  const allowedContracts = new Set(
    Object.values(context.availableContracts)
      .map((value) => value?.toLowerCase())
      .filter(Boolean)
  );

  for (const action of actions) {
    if (!action.targetContractAddress) {
      continue;
    }

    const contract = action.targetContractAddress.toLowerCase();
    if (allowedContracts.size > 0 && !allowedContracts.has(contract)) {
      throw new HttpError(502, `Anthropic proposed an unapproved contract address: ${action.targetContractAddress}`);
    }
  }
}

function normalizeAdapterTargets(actions: ProposedAction[], context: PlannerContext): ProposedAction[] {
  return actions.map((action) => {
    if (action.adapter === "FOUR_MEME") {
      const configured = context.availableContracts.FOUR_MEME ?? null;
      return {
        ...action,
        targetContractAddress: configured,
        metadata: {
          ...action.metadata,
          integrationConfigured: Boolean(configured),
          integrationWarning: configured
            ? undefined
            : "Four.Meme router is not configured. Planning remains available, but execution is adapter-gated."
        }
      };
    }

    if (action.adapter === "PANCAKESWAP") {
      const configured = context.availableContracts.PANCAKESWAP ?? null;
      return {
        ...action,
        targetContractAddress: configured,
        metadata: {
          ...action.metadata,
          integrationConfigured: Boolean(configured),
          integrationWarning: configured
            ? undefined
            : "PancakeSwap router is not configured. Planning remains available, but execution is adapter-gated."
        }
      };
    }

    return action;
  });
}

export class AnthropicAIProvider implements AIProvider {
  private readonly client: AnthropicClientLike;

  constructor(client?: AnthropicClientLike) {
    this.client =
      client ??
      new Anthropic({
        apiKey: env.ANTHROPIC_API_KEY,
        maxRetries: 0,
        timeout: 15_000
      });
  }

  private async completeJson<T>(input: {
    system: string;
    user: Record<string, unknown>;
    maxTokens: number;
  }): Promise<T> {
    try {
      const response = await this.client.messages.create({
        model: env.ANTHROPIC_MODEL,
        max_tokens: input.maxTokens,
        temperature: 0,
        system: `${input.system} Output raw JSON only. Do not use markdown fences or commentary.`,
        messages: [
          {
            role: "user",
            content: JSON.stringify(input.user)
          }
        ]
      });

      return parseJsonResponse<T>(extractText(response));
    } catch (error) {
      throw new HttpError(502, "Anthropic provider request failed", {
        reason: error instanceof Error ? error.message : "Unknown Anthropic error"
      });
    }
  }

  async parseIntent(input: { goal: string; policy: Policy; walletAddress: string }): Promise<Intent> {
    const response = await this.completeJson<Intent | Record<string, unknown>>({
      system:
        "Return compact JSON only. Extract BNB launch-operation intent. Never invent token or contract addresses. If missing, use null. Request clarification only when the goal is too ambiguous to safely plan.",
      user: {
        goal: input.goal,
        walletAddress: input.walletAddress,
        policy: compactPolicySummary(input.policy),
        schema: compactIntentPromptShape()
      },
      maxTokens: 320
    });

    return intentSchema.parse(normalizeIntentResponse(input.goal, response));
  }

  async planActions(input: { intent: Intent; policy: Policy; context: PlannerContext }): Promise<ProposedAction[]> {
    const response = await this.completeJson<ProposedAction[]>({
      system:
        "Return a JSON array only. Plan concrete BNB actions. Use only provided contract addresses. Never invent addresses. For BUY goals prefer one primary action. Keep plans compact and realistic for the stated budget.",
      user: {
        intent: input.intent,
        policy: compactPolicySummary(input.policy),
        context: {
          walletAddress: input.context.walletAddress,
          chainId: input.context.chainId,
          availableContracts: input.context.availableContracts
        },
        schema: [
          {
            order: 1,
            actionType: "BUY_TOKEN | SELL_TOKEN | TRANSFER_NATIVE | TRANSFER_TOKEN | APPROVE_TOKEN | ADD_LIQUIDITY | FOUR_MEME_BUY | FOUR_MEME_SELL",
            adapter: "FOUR_MEME | PANCAKESWAP | DIRECT | MOCK",
            targetContractAddress: "0x... | null",
            targetTokenAddress: "0x... | null",
            destinationAddress: "0x... | null",
            amountBnb: "string | null",
            amountTokenUnits: "string | null",
            slippageBps: 100,
            estimatedCostBnb: "string",
            label: "short action label",
            calldata: "0x... | null",
            metadata: { note: "short compact metadata" }
          }
        ]
      },
      maxTokens: 520
    });

    const actions = normalizeAdapterTargets(
      response.map((action) => proposedActionSchema.parse(action)),
      input.context
    );
    assertAllowedContractTargets(actions, input.context);

    return actions
      .slice()
      .sort((left, right) => left.order - right.order)
      .map((action, index) => ({
        ...action,
        order: index + 1,
        metadata: {
          ...action.metadata,
          source: "anthropic"
        }
      }));
  }

  async translatePolicy(input: { text: string }): Promise<Partial<Policy>> {
    const response = await this.completeJson<Partial<Policy>>({
      system:
        "Return compact JSON only. Convert policy text into Deadhand policy fields. Only include fields explicitly implied by the text. Never invent addresses.",
      user: {
        text: input.text,
        schema: compactPolicyTranslationShape()
      },
      maxTokens: 260
    });

    return createPolicyRequestSchema.partial().parse(response);
  }

  async explainRisk(input: {
    action: ProposedAction;
    decision: "BLOCKED" | "REQUIRES_APPROVAL" | "AUTO_APPROVED";
    simulationSuccess: boolean;
  }): Promise<RiskExplanation> {
    const expectedRiskLevel =
      input.decision === "BLOCKED" ? "BLOCKED" : input.decision === "REQUIRES_APPROVAL" ? "HIGH" : "LOW";

    const response = await this.completeJson<RiskExplanation | Record<string, unknown>>({
      system:
        "Return compact JSON only. Explain action risk in one short sentence under 180 characters. riskLevel must be BLOCKED, HIGH, or LOW to match the decision.",
      user: {
        action: {
          label: input.action.label,
          actionType: input.action.actionType,
          amountBnb: input.action.amountBnb,
          estimatedCostBnb: input.action.estimatedCostBnb,
          adapter: input.action.adapter
        },
        decision: input.decision,
        simulationSuccess: input.simulationSuccess,
        expectedRiskLevel
      },
      maxTokens: 180
    });

    const parsed = riskExplanationSchema.parse(normalizeRiskExplanationResponse(response, expectedRiskLevel));
    return {
      ...parsed,
      riskLevel: expectedRiskLevel
    };
  }
}
