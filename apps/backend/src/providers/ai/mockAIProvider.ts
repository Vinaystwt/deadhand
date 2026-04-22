import type { Intent, Policy, ProposedAction } from "@deadhand/types";
import { intentSchema, proposedActionSchema, riskExplanationSchema } from "@deadhand/types";
import type { AIProvider, PlannerContext } from "./types.js";

function extractAmountBnb(goal: string, fallback: string): string {
  const match = goal.match(/(\d+(?:\.\d+)?)\s*bnb/i);
  return match?.[1] ?? fallback;
}

function extractAddress(goal: string): string | null {
  const match = goal.match(/0x[a-fA-F0-9]{40}/);
  return match?.[0] ?? null;
}

function inferIntent(goal: string): Intent {
  const lower = goal.toLowerCase();
  if (lower.includes("launch") && !lower.includes("buy") && !lower.includes("liquidity") && !lower.includes("transfer")) {
    return intentSchema.parse({
      goalType: "LAUNCH_SUPPORT",
      targetTokenAddress: null,
      targetTokenSymbol: "MEME",
      totalBudgetBnb: null,
      operationType: "MULTI_STEP",
      constraints: [],
      clarificationNeeded: true,
      clarificationQuestion:
        "What exact launch action should Deadhand prepare first: buy on Four.Meme, seed liquidity, or transfer launch budget?"
    });
  }

  if (lower.includes("send") || lower.includes("transfer")) {
    return intentSchema.parse({
      goalType: "TRANSFER",
      targetTokenAddress: null,
      targetTokenSymbol: "BNB",
      totalBudgetBnb: extractAmountBnb(goal, "0.1"),
      operationType: "SINGLE",
      constraints: extractAddress(goal) ? [`destination:${extractAddress(goal)}`] : [],
      clarificationNeeded: false,
      clarificationQuestion: null
    });
  }

  if (lower.includes("liquidity")) {
    return intentSchema.parse({
      goalType: "ADD_LIQUIDITY",
      targetTokenAddress: null,
      targetTokenSymbol: "MEME",
      totalBudgetBnb: "2.0",
      operationType: "MULTI_STEP",
      constraints: ["Launch-stage budget management"],
      clarificationNeeded: false,
      clarificationQuestion: null
    });
  }

  if (lower.includes("buy") || lower.includes("swap") || lower.includes("stake")) {
    return intentSchema.parse({
      goalType: "BUY",
      targetTokenAddress: null,
      targetTokenSymbol: lower.includes("cake") ? "CAKE" : lower.includes("venus") ? "XVS" : "MEME",
      totalBudgetBnb: extractAmountBnb(goal, "0.2"),
      operationType: "SINGLE",
      constraints: [],
      clarificationNeeded: false,
      clarificationQuestion: null
    });
  }

  return intentSchema.parse({
    goalType: "LAUNCH_SUPPORT",
    targetTokenAddress: null,
    targetTokenSymbol: "MEME",
    totalBudgetBnb: "0.5",
    operationType: "MULTI_STEP",
    constraints: [],
    clarificationNeeded: false,
    clarificationQuestion: null
  });
}

function buildPlan(intent: Intent, context: PlannerContext): ProposedAction[] {
  const fourMemeRouter = context.availableContracts.FOUR_MEME ?? null;
  const pancakeRouter = context.availableContracts.PANCAKESWAP ?? null;
  const transferDestination =
    intent.constraints.find((constraint) => constraint.startsWith("destination:"))?.split(":")[1] ??
    "0x4444444444444444444444444444444444444444";
  const buyAmountBnb = intent.goalType === "BUY" ? intent.totalBudgetBnb ?? "0.1" : "0.1";

  const expensive = proposedActionSchema.parse({
    order: 1,
    actionType: "FOUR_MEME_BUY",
    adapter: fourMemeRouter ? "FOUR_MEME" : "MOCK",
    targetContractAddress: fourMemeRouter,
    targetTokenAddress: null,
    destinationAddress: null,
    amountBnb: "2.0",
    amountTokenUnits: null,
    slippageBps: 150,
    estimatedCostBnb: "2.0",
    label: "Attempt launch-stage Four.Meme buy with 2.0 BNB",
    calldata: null,
    metadata: {
      source: "mock-ai",
      phase: "launch",
      venue: "four-meme",
      route: ["FOUR_MEME_BONDING_CURVE"]
    }
  });

  const smaller = proposedActionSchema.parse({
    order: 2,
    actionType: "BUY_TOKEN",
    adapter: pancakeRouter ? "PANCAKESWAP" : "MOCK",
    targetContractAddress: pancakeRouter,
    targetTokenAddress: null,
    destinationAddress: null,
    amountBnb: buyAmountBnb,
    amountTokenUnits: null,
    slippageBps: 80,
    estimatedCostBnb: buyAmountBnb,
    label: pancakeRouter
      ? `Buy token with ${buyAmountBnb} BNB through PancakeSwap`
      : `Prepare ${buyAmountBnb} BNB swap while PancakeSwap router remains unconfigured`,
    calldata: null,
    metadata: {
      source: "mock-ai",
      phase: "post-launch",
      venue: "pancakeswap",
      route: pancakeRouter ? ["PANCAKESWAP_V2_ROUTER"] : ["PANCAKESWAP_UNCONFIGURED"],
      integrationConfigured: Boolean(pancakeRouter)
    }
  });

  const treasuryTransfer = proposedActionSchema.parse({
    order: 3,
    actionType: "TRANSFER_NATIVE",
    adapter: "DIRECT",
    targetContractAddress: null,
    targetTokenAddress: null,
    destinationAddress: transferDestination,
    amountBnb: intent.totalBudgetBnb ?? "0.05",
    amountTokenUnits: null,
    slippageBps: 0,
    estimatedCostBnb: intent.totalBudgetBnb ?? "0.05",
    label: `Transfer ${intent.totalBudgetBnb ?? "0.05"} BNB to designated destination`,
    calldata: null,
    metadata: {
      source: "mock-ai",
      phase: "ops",
      purpose: "treasury-funding"
    }
  });

  if (intent.goalType === "ADD_LIQUIDITY") {
    return [expensive, smaller, treasuryTransfer];
  }

  if (intent.goalType === "TRANSFER") {
    return [treasuryTransfer];
  }

  if (intent.goalType === "LAUNCH_SUPPORT") {
    return [smaller, treasuryTransfer];
  }

  return [smaller];
}

export class MockAIProvider implements AIProvider {
  async parseIntent(input: { goal: string; policy: Policy; walletAddress: string }): Promise<Intent> {
    return inferIntent(input.goal);
  }

  async planActions(input: { intent: Intent; policy: Policy; context: PlannerContext }): Promise<ProposedAction[]> {
    return buildPlan(input.intent, input.context);
  }

  async translatePolicy(_input: { text: string }): Promise<Partial<Policy>> {
    return {
      approvalThresholdBnb: "0.1",
      maxTransactionBnb: "0.5",
      allowedActionTypes: ["BUY_TOKEN", "FOUR_MEME_BUY"],
      simulationRequired: true
    };
  }

  async explainRisk(input: {
    action: ProposedAction;
    decision: "BLOCKED" | "REQUIRES_APPROVAL" | "AUTO_APPROVED";
    simulationSuccess: boolean;
  }) {
    const explanation =
      input.decision === "BLOCKED"
        ? "This action violates the active policy and has been blocked automatically."
        : input.decision === "REQUIRES_APPROVAL"
          ? "This action is policy-compliant but exceeds the approval threshold, so user approval is required."
          : "This action is within policy and low-risk under current rules.";

    return riskExplanationSchema.parse({
      riskLevel: input.decision === "BLOCKED" ? "BLOCKED" : input.decision === "REQUIRES_APPROVAL" ? "HIGH" : "LOW",
      explanation: `${input.action.label}. ${explanation} Simulation ${
        input.simulationSuccess ? "passed" : "did not pass"
      }.`
    });
  }
}
