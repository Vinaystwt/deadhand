import test from "node:test";
import assert from "node:assert/strict";
import { AnthropicAIProvider } from "../../src/providers/ai/anthropicAIProvider.js";

class FakeAnthropicClient {
  private readonly queue: string[];

  constructor(responses: string[]) {
    this.queue = [...responses];
  }

  messages = {
    create: async () => {
      const text = this.queue.shift();
      if (!text) {
        throw new Error("No fake Anthropic response queued");
      }

      return {
        content: [{ type: "text", text }]
      };
    }
  };
}

const basePolicy = {
  id: "10000000-0000-0000-0000-000000000001",
  userId: "10000000-0000-0000-0000-000000000002",
  walletAddress: "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa",
  name: "Anthropic Test Policy",
  description: "Policy for Anthropic adapter tests",
  version: 1,
  status: "ACTIVE" as const,
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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

test("AnthropicAIProvider parses compact JSON intent responses", async () => {
  const provider = new AnthropicAIProvider(
    new FakeAnthropicClient([
      JSON.stringify({
        goalType: "BUY",
        targetTokenAddress: null,
        targetTokenSymbol: "MEME",
        totalBudgetBnb: "0.1",
        operationType: "SINGLE",
        constraints: [],
        clarificationNeeded: false,
        clarificationQuestion: null
      })
    ]) as any
  );

  const intent = await provider.parseIntent({
    goal: "Buy the token with 0.1 BNB after launch",
    policy: basePolicy,
    walletAddress: basePolicy.walletAddress
  });

  assert.equal(intent.goalType, "BUY");
  assert.equal(intent.totalBudgetBnb, "0.1");
});

test("AnthropicAIProvider parses markdown-fenced JSON responses", async () => {
  const provider = new AnthropicAIProvider(
    new FakeAnthropicClient([
      [
        "```json",
        JSON.stringify({
          goalType: "BUY",
          targetTokenAddress: null,
          targetTokenSymbol: "CAKE",
          totalBudgetBnb: "0.05",
          operationType: "SINGLE",
          constraints: [],
          clarificationNeeded: false,
          clarificationQuestion: null
        }, null, 2),
        "```"
      ].join("\n")
    ]) as any
  );

  const intent = await provider.parseIntent({
    goal: "Swap 0.05 BNB for CAKE on PancakeSwap",
    policy: basePolicy,
    walletAddress: basePolicy.walletAddress
  });

  assert.equal(intent.goalType, "BUY");
  assert.equal(intent.targetTokenSymbol, "CAKE");
});

test("AnthropicAIProvider validates planned contracts against provided context", async () => {
  const provider = new AnthropicAIProvider(
    new FakeAnthropicClient([
      JSON.stringify([
        {
          order: 1,
          actionType: "BUY_TOKEN",
          adapter: "PANCAKESWAP",
          targetContractAddress: "0x2222222222222222222222222222222222222222",
          targetTokenAddress: null,
          destinationAddress: null,
          amountBnb: "0.1",
          amountTokenUnits: null,
          slippageBps: 80,
          estimatedCostBnb: "0.1",
          label: "Buy token with 0.1 BNB",
          calldata: null,
          metadata: {}
        }
      ])
    ]) as any
  );

  const actions = await provider.planActions({
    intent: {
      goalType: "BUY",
      targetTokenAddress: null,
      targetTokenSymbol: "MEME",
      totalBudgetBnb: "0.1",
      operationType: "SINGLE",
      constraints: [],
      clarificationNeeded: false,
      clarificationQuestion: null
    },
    policy: basePolicy,
    context: {
      walletAddress: basePolicy.walletAddress,
      chainId: 97,
      availableContracts: {
        PANCAKESWAP: "0x2222222222222222222222222222222222222222"
      }
    }
  });

  assert.equal(actions.length, 1);
  assert.equal(actions[0].metadata.source, "anthropic");
});
