import test from "node:test";
import assert from "node:assert/strict";
import type { Policy, ProposedAction } from "@deadhand/types";
import { evaluatePolicy } from "../../src/domain/policy.js";

const basePolicy: Policy = {
  id: crypto.randomUUID(),
  userId: crypto.randomUUID(),
  walletAddress: "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa",
  name: "Base",
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
  simulationRequired: true,
  description: null
};

const baseAction: ProposedAction = {
  id: crypto.randomUUID(),
  order: 1,
  actionType: "BUY_TOKEN",
  adapter: "PANCAKESWAP",
  targetContractAddress: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
  targetTokenAddress: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
  destinationAddress: null,
  amountBnb: "0.1",
  amountTokenUnits: null,
  slippageBps: 50,
  estimatedCostBnb: "0.1",
  label: "Test buy",
  calldata: null,
  metadata: {}
};

test("evaluatePolicy auto-approves actions within thresholds", () => {
  const result = evaluatePolicy(basePolicy, baseAction, { spentTodayBnb: "0" });
  assert.equal(result.decision, "AUTO_APPROVED");
});

test("evaluatePolicy requires approval above threshold", () => {
  const result = evaluatePolicy({ ...basePolicy, approvalThresholdBnb: "0.05" }, baseAction, { spentTodayBnb: "0" });
  assert.equal(result.decision, "REQUIRES_APPROVAL");
});

test("evaluatePolicy blocks oversized transactions", () => {
  const result = evaluatePolicy(basePolicy, { ...baseAction, estimatedCostBnb: "1.0" }, { spentTodayBnb: "0" });
  assert.equal(result.decision, "BLOCKED");
  assert.match(result.explanation[0], /max transaction/i);
});

test("evaluatePolicy blocks when daily spend would be exceeded", () => {
  const result = evaluatePolicy(basePolicy, { ...baseAction, estimatedCostBnb: "0.3" }, { spentTodayBnb: "1.9" });
  assert.equal(result.decision, "BLOCKED");
  assert.match(result.explanation.join(" "), /projected daily spend/i);
});

test("evaluatePolicy blocks disallowed tokens", () => {
  const result = evaluatePolicy(
    { ...basePolicy, allowedTokenAddresses: ["0x1111111111111111111111111111111111111111"] },
    baseAction,
    { spentTodayBnb: "0" }
  );
  assert.equal(result.decision, "BLOCKED");
});

test("evaluatePolicy blocks blocked contracts", () => {
  const result = evaluatePolicy(
    { ...basePolicy, blockedContractAddresses: [baseAction.targetContractAddress!] },
    baseAction,
    { spentTodayBnb: "0" }
  );
  assert.equal(result.decision, "BLOCKED");
});

test("evaluatePolicy blocks excessive slippage", () => {
  const result = evaluatePolicy(basePolicy, { ...baseAction, slippageBps: 500 }, { spentTodayBnb: "0" });
  assert.equal(result.decision, "BLOCKED");
});

test("evaluatePolicy blocks paused policy", () => {
  const result = evaluatePolicy({ ...basePolicy, emergencyPaused: true }, baseAction, { spentTodayBnb: "0" });
  assert.equal(result.decision, "BLOCKED");
});
