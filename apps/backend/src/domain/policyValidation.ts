import type { Policy } from "@deadhand/types";
import { HttpError } from "../lib/httpError.js";

function hasOverlap(left: string[], right: string[]): string[] {
  return left.filter((item) => right.includes(item));
}

function parseDecimal(value: string): number {
  return Number(value);
}

export function validatePolicyInput(policy: Policy): void {
  if (parseDecimal(policy.approvalThresholdBnb) > parseDecimal(policy.maxTransactionBnb)) {
    throw new HttpError(400, "approvalThresholdBnb must be less than or equal to maxTransactionBnb");
  }

  if (parseDecimal(policy.maxTransactionBnb) <= 0 || parseDecimal(policy.maxDailySpendBnb) <= 0) {
    throw new HttpError(400, "Policy BNB thresholds must be positive");
  }

  if (hasOverlap(policy.allowedTokenAddresses, policy.blockedTokenAddresses).length > 0) {
    throw new HttpError(400, "Allowed and blocked token lists cannot overlap");
  }

  if (hasOverlap(policy.allowedContractAddresses, policy.blockedContractAddresses).length > 0) {
    throw new HttpError(400, "Allowed and blocked contract lists cannot overlap");
  }

  if (hasOverlap(policy.allowedActionTypes, policy.blockedActionTypes).length > 0) {
    throw new HttpError(400, "Allowed and blocked action type lists cannot overlap");
  }
}
