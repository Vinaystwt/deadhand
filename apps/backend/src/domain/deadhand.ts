import { createHash } from "node:crypto";
import type {
  DecisionReceipt,
  DecisionTrigger,
  ExecutionEnvelope,
  Policy,
  PolicyCheckResult,
  PolicyDecision,
  ProposedAction,
  ReasonCode,
  SafetyCard,
  Severity,
  SimulationResult
} from "@deadhand/types";
import { decisionReceiptSchema, driftReceiptSchema, executionEnvelopeSchema, safetyCardSchema } from "@deadhand/types";
import { env } from "../config/env.js";
import { getConfiguredContractAddresses } from "./integrations.js";

export function buildAttemptedActionSummary(action: ProposedAction) {
  return {
    actionType: action.actionType,
    adapter: action.adapter,
    label: action.label,
    estimatedCostBnb: action.estimatedCostBnb,
    targetContractAddress: action.targetContractAddress,
    targetTokenAddress: action.targetTokenAddress,
    destinationAddress: action.destinationAddress,
    slippageBps: action.slippageBps
  };
}

export function severityRank(severity: Severity): number {
  return {
    INFO: 0,
    WARNING: 1,
    HIGH: 2,
    CRITICAL: 3
  }[severity];
}

export function buildDecisionReceipt(
  action: ProposedAction,
  decision: PolicyDecision,
  triggers: DecisionTrigger[]
): DecisionReceipt {
  const sorted = [...triggers].sort((left, right) => severityRank(right.severity) - severityRank(left.severity));
  const primary = sorted[0];
  const safeAlternative = primary.safeAlternative ?? null;
  const requiredCorrection = primary.requiredCorrection ?? null;

  return decisionReceiptSchema.parse({
    decision,
    primaryReasonCode: primary.reasonCode,
    reasonCodes: [...new Set(sorted.map((trigger) => trigger.reasonCode))],
    severity: primary.severity,
    humanExplanation:
      decision === "BLOCKED"
        ? `Deadhand vetoed this action. ${primary.humanExplanation}`
        : decision === "REQUIRES_APPROVAL"
          ? `Deadhand requires explicit approval. ${primary.humanExplanation}`
          : primary.humanExplanation,
    machineExplanation: JSON.stringify({
      decision,
      primaryReasonCode: primary.reasonCode,
      triggerCount: sorted.length,
      triggerPaths: sorted.map((trigger) => trigger.triggerPath)
    }),
    attempted: buildAttemptedActionSummary(action),
    triggers: sorted,
    safeAlternative,
    requiredCorrection
  });
}

export function buildExecutionEnvelope(
  action: ProposedAction,
  request: { from: string; to: string; valueWei: string; chainId: number; data: string | null }
): ExecutionEnvelope {
  const calldataFingerprint = createHash("sha256").update(request.data ?? "").digest("hex");
  return executionEnvelopeSchema.parse({
    actionType: action.actionType,
    adapter: action.adapter,
    chainId: request.chainId,
    from: request.from,
    to: request.to,
    valueWei: request.valueWei,
    calldataFingerprint,
    targetContractAddress: action.targetContractAddress,
    targetTokenAddress: action.targetTokenAddress
  });
}

export function buildSafetyCard(input: {
  policy: Policy;
  action: ProposedAction;
  decision: PolicyDecision;
  receipt: DecisionReceipt;
  simulation: SimulationResult;
}): SafetyCard {
  const reasonCodes = [...input.receipt.reasonCodes];
  if (input.simulation.success) {
    reasonCodes.push("SIMULATION_PASSED");
  } else if (input.simulation.status !== "SKIPPED") {
    reasonCodes.push("SIMULATION_FAILED");
  }

  return safetyCardSchema.parse({
    estimatedSpendBnb: input.action.estimatedCostBnb,
    valueAtRiskBnb: input.action.amountBnb ?? input.action.estimatedCostBnb,
    contractsTouched: input.action.targetContractAddress ? [input.action.targetContractAddress] : [],
    tokensTouched: input.action.targetTokenAddress ? [input.action.targetTokenAddress] : [],
    approvalScope:
      input.decision === "REQUIRES_APPROVAL"
        ? `User approval required above ${input.policy.approvalThresholdBnb} BNB`
        : input.decision === "BLOCKED"
          ? "No approval possible while the veto condition remains"
          : `Auto-approved below ${input.policy.approvalThresholdBnb} BNB`,
    simulationResult: {
      status: input.simulation.status,
      success: input.simulation.success,
      gasEstimate: input.simulation.gasEstimate,
      error: input.simulation.error
    },
    riskSummary:
      input.decision === "BLOCKED"
        ? `Blocked by Deadhand due to ${input.receipt.primaryReasonCode}.`
        : input.decision === "REQUIRES_APPROVAL"
          ? `Within policy bounds but above auto-approval threshold.`
          : "Within current policy bounds and eligible for low-friction execution.",
    reasonCodes: [...new Set(reasonCodes)],
    approvalRequired: input.decision === "REQUIRES_APPROVAL",
    killSwitchActive: input.policy.emergencyPaused || input.policy.status !== "ACTIVE"
  });
}

export function buildDriftReceipt(input: {
  expected: ExecutionEnvelope;
  actual: ExecutionEnvelope;
  mismatchFields: string[];
}) {
  return driftReceiptSchema.parse({
    status: "DRIFT_BLOCKED",
    reasonCode: "EXECUTION_DRIFT_BLOCKED",
    humanExplanation: `Deadhand blocked execution drift. The final call changed ${input.mismatchFields.join(", ")} after approval.`,
    machineExplanation: JSON.stringify({
      reasonCode: "EXECUTION_DRIFT_BLOCKED",
      mismatchFields: input.mismatchFields
    }),
    expected: input.expected,
    actual: input.actual
  });
}

export function compareExecutionEnvelopes(expected: ExecutionEnvelope, actual: ExecutionEnvelope) {
  const mismatchFields: string[] = [];
  const fields: Array<keyof ExecutionEnvelope> = [
    "actionType",
    "adapter",
    "chainId",
    "from",
    "to",
    "valueWei",
    "calldataFingerprint"
  ];

  for (const field of fields) {
    if (expected[field] !== actual[field]) {
      mismatchFields.push(field);
    }
  }

  return {
    matches: mismatchFields.length === 0,
    mismatchFields
  };
}

export function createReasonCodeSummary(reasonCodes: ReasonCode[]): string {
  return [...new Set(reasonCodes)].join(", ");
}

export function defaultAvailableContracts() {
  return getConfiguredContractAddresses();
}
