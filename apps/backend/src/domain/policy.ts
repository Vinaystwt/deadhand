import type {
  DecisionTrigger,
  Policy,
  PolicyCheckResult,
  PolicyDecision,
  PolicyRule,
  ProposedAction,
  ReasonCode,
  RuleType,
  Severity
} from "@deadhand/types";
import { buildDecisionReceipt } from "./deadhand.js";

export interface DailySpendSnapshot {
  spentTodayBnb: string;
}

function toBigIntDecimal(value: string, decimals = 18): bigint {
  const [whole, fraction = ""] = value.split(".");
  const normalized = `${whole}${fraction.padEnd(decimals, "0").slice(0, decimals)}`;
  return BigInt(normalized);
}

function greaterThan(left: string, right: string): boolean {
  return toBigIntDecimal(left) > toBigIntDecimal(right);
}

function addValues(left: string, right: string): string {
  const sum = toBigIntDecimal(left) + toBigIntDecimal(right);
  const raw = sum.toString().padStart(19, "0");
  const whole = raw.slice(0, -18) || "0";
  const fraction = raw.slice(-18).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

export function derivePolicyRules(policy: Policy): PolicyRule[] {
  return [
    {
      ruleType: "EMERGENCY_PAUSED",
      field: "emergencyPaused",
      operator: "IS_TRUE",
      value: true,
      decision: "BLOCK",
      explanation: "Policy is paused. All actions are blocked.",
      isActive: true
    },
    {
      ruleType: "MAX_TRANSACTION_BNB",
      field: "estimatedCostBnb",
      operator: "GT",
      value: policy.maxTransactionBnb,
      decision: "BLOCK",
      explanation: `Action exceeds max transaction limit of ${policy.maxTransactionBnb} BNB.`,
      isActive: true
    },
    {
      ruleType: "MAX_DAILY_SPEND_BNB",
      field: "dailySpendTotal",
      operator: "GT",
      value: policy.maxDailySpendBnb,
      decision: "BLOCK",
      explanation: `Action exceeds daily spend limit of ${policy.maxDailySpendBnb} BNB.`,
      isActive: true
    },
    {
      ruleType: "ALLOWED_TOKEN_LIST",
      field: "targetTokenAddress",
      operator: "NOT_IN",
      value: policy.allowedTokenAddresses,
      decision: "BLOCK",
      explanation: "Target token is not in the allowed token list.",
      isActive: true
    },
    {
      ruleType: "BLOCKED_TOKEN_LIST",
      field: "targetTokenAddress",
      operator: "IN",
      value: policy.blockedTokenAddresses,
      decision: "BLOCK",
      explanation: "Target token is blocked by policy.",
      isActive: true
    },
    {
      ruleType: "ALLOWED_CONTRACTS",
      field: "targetContractAddress",
      operator: "NOT_IN",
      value: policy.allowedContractAddresses,
      decision: "BLOCK",
      explanation: "Target contract is not allowed by policy.",
      isActive: true
    },
    {
      ruleType: "BLOCKED_CONTRACTS",
      field: "targetContractAddress",
      operator: "IN",
      value: policy.blockedContractAddresses,
      decision: "BLOCK",
      explanation: "Target contract is blocked by policy.",
      isActive: true
    },
    {
      ruleType: "ALLOWED_ACTION_TYPES",
      field: "actionType",
      operator: "NOT_IN",
      value: policy.allowedActionTypes,
      decision: "BLOCK",
      explanation: "Action type is not in the allowed action list.",
      isActive: true
    },
    {
      ruleType: "BLOCKED_ACTION_TYPES",
      field: "actionType",
      operator: "IN",
      value: policy.blockedActionTypes,
      decision: "BLOCK",
      explanation: "Action type is blocked by policy.",
      isActive: true
    },
    {
      ruleType: "MAX_SLIPPAGE_BPS",
      field: "slippageBps",
      operator: "GT",
      value: policy.maxSlippageBps,
      decision: "BLOCK",
      explanation: `Action slippage exceeds ${policy.maxSlippageBps} bps.`,
      isActive: true
    },
    {
      ruleType: "APPROVAL_THRESHOLD_BNB",
      field: "estimatedCostBnb",
      operator: "GT",
      value: policy.approvalThresholdBnb,
      decision: "REQUIRES_APPROVAL",
      explanation: `Action exceeds approval threshold of ${policy.approvalThresholdBnb} BNB.`,
      isActive: true
    }
  ];
}

function makeTrigger(input: {
  ruleType: RuleType;
  reasonCode: ReasonCode;
  severity: Severity;
  field: string;
  operator: string;
  expected?: unknown;
  actual?: unknown;
  triggerPath: string;
  humanExplanation: string;
  machineExplanation: string;
  safeAlternative?: string | null;
  requiredCorrection?: string | null;
}): DecisionTrigger {
  return {
    ...input,
    safeAlternative: input.safeAlternative ?? null,
    requiredCorrection: input.requiredCorrection ?? null
  };
}

export function evaluatePolicy(
  policy: Policy,
  action: ProposedAction,
  dailySpend: DailySpendSnapshot
): PolicyCheckResult {
  const explanations: string[] = [];
  const triggeredRules: PolicyCheckResult["triggeredRules"] = [];

  if (policy.emergencyPaused || policy.status !== "ACTIVE") {
    const trigger = makeTrigger({
      ruleType: "EMERGENCY_PAUSED",
      reasonCode: "POLICY_VETO_EMERGENCY_PAUSED",
      severity: "CRITICAL",
      field: "policy.status",
      operator: "IS_TRUE",
      expected: "ACTIVE",
      actual: policy.status,
      triggerPath: "policy.status",
      humanExplanation: "Deadhand emergency controls are active, so execution is paused.",
      machineExplanation: JSON.stringify({
        reasonCode: "POLICY_VETO_EMERGENCY_PAUSED",
        status: policy.status,
        emergencyPaused: policy.emergencyPaused
      }),
      requiredCorrection: "Resume the policy or clear the emergency stop before trying again."
    });
    return {
      decision: "BLOCKED",
      triggeredRules: [trigger],
      explanation: ["Policy is paused or archived."],
      reasonCodes: [trigger.reasonCode],
      receipt: buildDecisionReceipt(action, "BLOCKED", [trigger])
    };
  }

  if (greaterThan(action.estimatedCostBnb, policy.maxTransactionBnb)) {
    const message = `BLOCKED: proposed ${action.estimatedCostBnb} BNB exceeds max transaction ${policy.maxTransactionBnb} BNB.`;
    explanations.push(message);
    triggeredRules.push(
      makeTrigger({
        ruleType: "MAX_TRANSACTION_BNB",
        reasonCode: "POLICY_VETO_MAX_TRANSACTION",
        severity: "CRITICAL",
        field: "estimatedCostBnb",
        operator: "GT",
        expected: policy.maxTransactionBnb,
        actual: action.estimatedCostBnb,
        triggerPath: "action.estimatedCostBnb",
        humanExplanation: message,
        machineExplanation: JSON.stringify({
          reasonCode: "POLICY_VETO_MAX_TRANSACTION",
          expected: policy.maxTransactionBnb,
          actual: action.estimatedCostBnb
        }),
        safeAlternative: `Reduce the action size to ${policy.maxTransactionBnb} BNB or less.`,
        requiredCorrection: "Lower the spend amount before asking Deadhand to execute it."
      })
    );
  }

  const projectedDailySpend = addValues(dailySpend.spentTodayBnb, action.estimatedCostBnb);
  if (greaterThan(projectedDailySpend, policy.maxDailySpendBnb)) {
    const message = `BLOCKED: projected daily spend ${projectedDailySpend} BNB exceeds max daily spend ${policy.maxDailySpendBnb} BNB.`;
    explanations.push(message);
    triggeredRules.push(
      makeTrigger({
        ruleType: "MAX_DAILY_SPEND_BNB",
        reasonCode: "POLICY_VETO_MAX_DAILY_SPEND",
        severity: "HIGH",
        field: "projectedDailySpend",
        operator: "GT",
        expected: policy.maxDailySpendBnb,
        actual: projectedDailySpend,
        triggerPath: "policy.maxDailySpendBnb",
        humanExplanation: message,
        machineExplanation: JSON.stringify({
          reasonCode: "POLICY_VETO_MAX_DAILY_SPEND",
          expected: policy.maxDailySpendBnb,
          actual: projectedDailySpend
        }),
        safeAlternative: "Reduce spend today or wait until the daily spend window resets."
      })
    );
  }

  if (
    policy.allowedTokenAddresses.length > 0 &&
    action.targetTokenAddress &&
    !policy.allowedTokenAddresses.includes(action.targetTokenAddress)
  ) {
    const message = `BLOCKED: token ${action.targetTokenAddress} is not in the allowed token list.`;
    explanations.push(message);
    triggeredRules.push(
      makeTrigger({
        ruleType: "ALLOWED_TOKEN_LIST",
        reasonCode: "POLICY_VETO_TOKEN_NOT_ALLOWED",
        severity: "HIGH",
        field: "targetTokenAddress",
        operator: "NOT_IN",
        expected: policy.allowedTokenAddresses,
        actual: action.targetTokenAddress,
        triggerPath: "action.targetTokenAddress",
        humanExplanation: message,
        machineExplanation: JSON.stringify({
          reasonCode: "POLICY_VETO_TOKEN_NOT_ALLOWED",
          actual: action.targetTokenAddress
        }),
        requiredCorrection: "Use a token address that is explicitly allowed by the active policy."
      })
    );
  }

  if (action.targetTokenAddress && policy.blockedTokenAddresses.includes(action.targetTokenAddress)) {
    const message = `BLOCKED: token ${action.targetTokenAddress} is explicitly blocked.`;
    explanations.push(message);
    triggeredRules.push(
      makeTrigger({
        ruleType: "BLOCKED_TOKEN_LIST",
        reasonCode: "POLICY_VETO_TOKEN_BLOCKLIST",
        severity: "HIGH",
        field: "targetTokenAddress",
        operator: "IN",
        expected: policy.blockedTokenAddresses,
        actual: action.targetTokenAddress,
        triggerPath: "action.targetTokenAddress",
        humanExplanation: message,
        machineExplanation: JSON.stringify({
          reasonCode: "POLICY_VETO_TOKEN_BLOCKLIST",
          actual: action.targetTokenAddress
        }),
        requiredCorrection: "Choose a token that is not blocked by policy."
      })
    );
  }

  if (
    policy.allowedContractAddresses.length > 0 &&
    action.targetContractAddress &&
    !policy.allowedContractAddresses.includes(action.targetContractAddress)
  ) {
    const message = `BLOCKED: contract ${action.targetContractAddress} is not allowed.`;
    explanations.push(message);
    triggeredRules.push(
      makeTrigger({
        ruleType: "ALLOWED_CONTRACTS",
        reasonCode: "POLICY_VETO_CONTRACT_NOT_ALLOWED",
        severity: "CRITICAL",
        field: "targetContractAddress",
        operator: "NOT_IN",
        expected: policy.allowedContractAddresses,
        actual: action.targetContractAddress,
        triggerPath: "action.targetContractAddress",
        humanExplanation: message,
        machineExplanation: JSON.stringify({
          reasonCode: "POLICY_VETO_CONTRACT_NOT_ALLOWED",
          actual: action.targetContractAddress
        }),
        requiredCorrection: "Use a contract address that belongs to the approved launch surface."
      })
    );
  }

  if (action.targetContractAddress && policy.blockedContractAddresses.includes(action.targetContractAddress)) {
    const message = `BLOCKED: contract ${action.targetContractAddress} is blocked.`;
    explanations.push(message);
    triggeredRules.push(
      makeTrigger({
        ruleType: "BLOCKED_CONTRACTS",
        reasonCode: "POLICY_VETO_CONTRACT_BLOCKLIST",
        severity: "CRITICAL",
        field: "targetContractAddress",
        operator: "IN",
        expected: policy.blockedContractAddresses,
        actual: action.targetContractAddress,
        triggerPath: "action.targetContractAddress",
        humanExplanation: message,
        machineExplanation: JSON.stringify({
          reasonCode: "POLICY_VETO_CONTRACT_BLOCKLIST",
          actual: action.targetContractAddress
        }),
        requiredCorrection: "Remove the blocked contract from the execution plan."
      })
    );
  }

  if (action.slippageBps > policy.maxSlippageBps) {
    const message = `BLOCKED: slippage ${action.slippageBps} bps exceeds max ${policy.maxSlippageBps} bps.`;
    explanations.push(message);
    triggeredRules.push(
      makeTrigger({
        ruleType: "MAX_SLIPPAGE_BPS",
        reasonCode: "POLICY_VETO_SLIPPAGE_EXCEEDED",
        severity: "HIGH",
        field: "slippageBps",
        operator: "GT",
        expected: policy.maxSlippageBps,
        actual: action.slippageBps,
        triggerPath: "action.slippageBps",
        humanExplanation: message,
        machineExplanation: JSON.stringify({
          reasonCode: "POLICY_VETO_SLIPPAGE_EXCEEDED",
          expected: policy.maxSlippageBps,
          actual: action.slippageBps
        }),
        safeAlternative: `Lower slippage to ${policy.maxSlippageBps} bps or below.`
      })
    );
  }

  if (policy.blockedActionTypes.includes(action.actionType)) {
    const message = `BLOCKED: action type ${action.actionType} is blocked by policy.`;
    explanations.push(message);
    triggeredRules.push(
      makeTrigger({
        ruleType: "BLOCKED_ACTION_TYPES",
        reasonCode: "POLICY_VETO_ACTION_BLOCKLIST",
        severity: "HIGH",
        field: "actionType",
        operator: "IN",
        expected: policy.blockedActionTypes,
        actual: action.actionType,
        triggerPath: "action.actionType",
        humanExplanation: message,
        machineExplanation: JSON.stringify({
          reasonCode: "POLICY_VETO_ACTION_BLOCKLIST",
          actual: action.actionType
        }),
        requiredCorrection: "Use an action type that is explicitly allowed by the active guard pack."
      })
    );
  }

  if (policy.allowedActionTypes.length > 0 && !policy.allowedActionTypes.includes(action.actionType)) {
    const message = `BLOCKED: action type ${action.actionType} is not in the allowed action list.`;
    explanations.push(message);
    triggeredRules.push(
      makeTrigger({
        ruleType: "ALLOWED_ACTION_TYPES",
        reasonCode: "POLICY_VETO_ACTION_NOT_ALLOWED",
        severity: "HIGH",
        field: "actionType",
        operator: "NOT_IN",
        expected: policy.allowedActionTypes,
        actual: action.actionType,
        triggerPath: "action.actionType",
        humanExplanation: message,
        machineExplanation: JSON.stringify({
          reasonCode: "POLICY_VETO_ACTION_NOT_ALLOWED",
          actual: action.actionType
        }),
        requiredCorrection: "Choose an action type that belongs to the allowed action surface."
      })
    );
  }

  if (triggeredRules.length > 0) {
    return {
      decision: "BLOCKED",
      triggeredRules,
      explanation: explanations,
      reasonCodes: triggeredRules.map((trigger) => trigger.reasonCode),
      receipt: buildDecisionReceipt(action, "BLOCKED", triggeredRules)
    };
  }

  const decision: PolicyDecision = greaterThan(action.estimatedCostBnb, policy.approvalThresholdBnb)
    ? "REQUIRES_APPROVAL"
    : "AUTO_APPROVED";

  if (decision === "REQUIRES_APPROVAL") {
    const message = `Action exceeds approval threshold of ${policy.approvalThresholdBnb} BNB and requires user approval.`;
    const trigger = makeTrigger({
      ruleType: "APPROVAL_THRESHOLD_BNB",
      reasonCode: "POLICY_REQUIRES_APPROVAL_THRESHOLD",
      severity: "WARNING",
      field: "estimatedCostBnb",
      operator: "GT",
      expected: policy.approvalThresholdBnb,
      actual: action.estimatedCostBnb,
      triggerPath: "action.estimatedCostBnb",
      humanExplanation: message,
      machineExplanation: JSON.stringify({
        reasonCode: "POLICY_REQUIRES_APPROVAL_THRESHOLD",
        expected: policy.approvalThresholdBnb,
        actual: action.estimatedCostBnb
      }),
      safeAlternative: `Lower the action size to ${policy.approvalThresholdBnb} BNB or less for auto-approval.`
    });
    return {
      decision,
      triggeredRules: [trigger],
      explanation: [message],
      reasonCodes: [trigger.reasonCode],
      receipt: buildDecisionReceipt(action, decision, [trigger])
    };
  }

  const trigger = makeTrigger({
    ruleType: "APPROVAL_THRESHOLD_BNB",
    reasonCode: "POLICY_AUTO_APPROVED_WITHIN_SCOPE",
    severity: "INFO",
    field: "estimatedCostBnb",
    operator: "LTE",
    expected: policy.approvalThresholdBnb,
    actual: action.estimatedCostBnb,
    triggerPath: "action.estimatedCostBnb",
      humanExplanation: "Action is within policy and eligible for auto approval.",
      machineExplanation: JSON.stringify({
      reasonCode: "POLICY_AUTO_APPROVED_WITHIN_SCOPE",
      autoApproved: true
    }),
    safeAlternative: "Proceed with the guarded execution path."
  });
  return {
    decision,
    triggeredRules: [trigger],
    explanation: ["Action is within policy and eligible for auto approval."],
    reasonCodes: [trigger.reasonCode],
    receipt: buildDecisionReceipt(action, decision, [trigger])
  };
}
