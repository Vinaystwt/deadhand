import { createRepositories } from "../lib/memoryStore.js";
import { MockChainProvider } from "../providers/chain/mockChainProvider.js";
import { createAIProvider } from "../providers/ai/index.js";
import { AIService } from "../services/ai/aiService.js";
import { AuditService } from "../services/audit/auditService.js";
import { ExecutionService } from "../services/execution/executionService.js";
import { PolicyService } from "../services/policy/policyService.js";
import { PolicyPresetService } from "../services/policy/presetService.js";
import { TaskService } from "../services/task/taskService.js";
import { env } from "../config/env.js";

async function main() {
  const repositories = createRepositories();
  const aiProvider = createAIProvider();
  const audit = new AuditService(repositories.audit);
  const ai = new AIService(aiProvider);
  const policy = new PolicyService(repositories.policies, ai, new PolicyPresetService());
  const execution = new ExecutionService(new MockChainProvider());
  const task = new TaskService(repositories, ai, execution, audit);

  const userId = "30000000-0000-0000-0000-000000000001";
  const walletAddress = "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa";

  const createdPolicy = await policy.create(userId, {
    walletAddress,
    name: "Anthropic Smoke Policy",
    description: "Local smoke test policy",
    approvalThresholdBnb: "0.5",
    maxTransactionBnb: "2.0",
    maxDailySpendBnb: "5.0",
    maxSlippageBps: 100,
    allowedTokenAddresses: [],
    blockedTokenAddresses: [],
    allowedContractAddresses: [],
    blockedContractAddresses: [],
    allowedActionTypes: [],
    blockedActionTypes: [],
    simulationRequired: true,
    emergencyPaused: false,
    status: "ACTIVE"
  });

  const createdTask = await task.createTask(userId, walletAddress, {
    policyId: createdPolicy.id,
    goal: "Swap 0.05 BNB for CAKE on PancakeSwap with max 1% slippage"
  });

  console.log(
    JSON.stringify(
      {
        provider: env.AI_PROVIDER,
        model: env.ANTHROPIC_MODEL,
        actionCount: createdTask.actions.length,
        taskStatus: createdTask.status,
        actions: createdTask.actions.map((action) => ({
          label: action.label,
          policyDecision: action.policyDecision,
          riskLevel: action.riskLevel
        })),
        estimatedAnthropicCalls: createdTask.actions.length > 0 ? 3 : 1
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
