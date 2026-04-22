import type { Intent, Policy, ProposedAction, RiskExplanation } from "@deadhand/types";

export interface PlannerContext {
  walletAddress: string;
  chainId: number;
  availableContracts: Record<string, string>;
}

export interface AIProvider {
  parseIntent(input: { goal: string; policy: Policy; walletAddress: string }): Promise<Intent>;
  planActions(input: { intent: Intent; policy: Policy; context: PlannerContext }): Promise<ProposedAction[]>;
  translatePolicy(input: { text: string }): Promise<Partial<Policy>>;
  explainRisk(input: {
    action: ProposedAction;
    decision: "BLOCKED" | "REQUIRES_APPROVAL" | "AUTO_APPROVED";
    simulationSuccess: boolean;
  }): Promise<RiskExplanation>;
}
