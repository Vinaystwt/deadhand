import type { Intent, Policy, ProposedAction } from "@deadhand/types";
import { logger } from "../../lib/logger.js";
import { HttpError } from "../../lib/httpError.js";
import { MockAIProvider } from "../../providers/ai/mockAIProvider.js";
import type { AIProvider } from "../../providers/ai/types.js";
import { ZodError } from "zod";

export class AIService {
  constructor(
    private readonly provider: AIProvider,
    private readonly fallbackProvider: AIProvider | null = provider instanceof MockAIProvider ? null : new MockAIProvider()
  ) {}

  private shouldFallback(error: unknown) {
    if (!this.fallbackProvider) {
      return false;
    }

    if (error instanceof HttpError) {
      return error.statusCode >= 502;
    }

    return error instanceof ZodError || error instanceof SyntaxError;
  }

  private async runWithFallback<T>(operation: string, work: (provider: AIProvider) => Promise<T>): Promise<T> {
    try {
      return await work(this.provider);
    } catch (error) {
      if (!this.shouldFallback(error)) {
        throw error;
      }

      logger.warn(
        {
          operation,
          provider: this.provider.constructor.name,
          fallbackProvider: this.fallbackProvider!.constructor.name,
          reason: error instanceof HttpError ? error.details ?? error.message : error instanceof Error ? error.message : "unknown"
        },
        "Primary AI provider failed; falling back to mock provider"
      );
      return work(this.fallbackProvider!);
    }
  }

  async parseIntent(goal: string, policy: Policy, walletAddress: string): Promise<Intent> {
    return this.runWithFallback("parseIntent", (provider) => provider.parseIntent({ goal, policy, walletAddress }));
  }

  async planActions(input: {
    intent: Intent;
    policy: Policy;
    walletAddress: string;
    chainId: number;
    availableContracts: Record<string, string>;
  }): Promise<ProposedAction[]> {
    return this.runWithFallback("planActions", (provider) =>
      provider.planActions({
        intent: input.intent,
        policy: input.policy,
        context: {
          walletAddress: input.walletAddress,
          chainId: input.chainId,
          availableContracts: input.availableContracts
        }
      })
    );
  }

  async translatePolicy(text: string): Promise<Partial<Policy>> {
    return this.runWithFallback("translatePolicy", (provider) => provider.translatePolicy({ text }));
  }

  async explainRisk(input: {
    action: ProposedAction;
    decision: "BLOCKED" | "REQUIRES_APPROVAL" | "AUTO_APPROVED";
    simulationSuccess: boolean;
  }) {
    return this.runWithFallback("explainRisk", (provider) => provider.explainRisk(input));
  }
}
