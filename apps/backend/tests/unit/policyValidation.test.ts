import test from "node:test";
import assert from "node:assert/strict";
import type { Policy } from "@deadhand/types";
import { validatePolicyInput } from "../../src/domain/policyValidation.js";

const validPolicy: Policy = {
  id: crypto.randomUUID(),
  userId: crypto.randomUUID(),
  walletAddress: "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa",
  name: "Valid",
  description: null,
  version: 1,
  status: "ACTIVE",
  emergencyPaused: false,
  approvalThresholdBnb: "0.1",
  maxTransactionBnb: "0.5",
  maxDailySpendBnb: "2.0",
  maxSlippageBps: 100,
  allowedTokenAddresses: [],
  blockedTokenAddresses: [],
  allowedContractAddresses: [],
  blockedContractAddresses: [],
  allowedActionTypes: [],
  blockedActionTypes: [],
  simulationRequired: true
};

test("validatePolicyInput accepts valid policy input", () => {
  assert.doesNotThrow(() => validatePolicyInput(validPolicy));
});

test("validatePolicyInput rejects invalid thresholds", () => {
  assert.throws(
    () =>
      validatePolicyInput({
        ...validPolicy,
        approvalThresholdBnb: "0.6"
      }),
    /approvalThresholdBnb/
  );
});

test("validatePolicyInput rejects overlapping token lists", () => {
  assert.throws(
    () =>
      validatePolicyInput({
        ...validPolicy,
        allowedTokenAddresses: ["0x1111111111111111111111111111111111111111"],
        blockedTokenAddresses: ["0x1111111111111111111111111111111111111111"]
      }),
    /token lists/
  );
});
