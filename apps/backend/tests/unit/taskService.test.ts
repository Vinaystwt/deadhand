import test from "node:test";
import assert from "node:assert/strict";
import type { ExecutionRequest, Intent, Policy, ProposedAction, RiskExplanation, SimulationResult } from "@deadhand/types";
import { createRepositories } from "../../src/lib/memoryStore.js";
import { createServices } from "../../src/index.js";
import { HttpError } from "../../src/lib/httpError.js";
import type { AIProvider, PlannerContext } from "../../src/providers/ai/types.js";
import type { ChainProvider, PreparedExecution } from "../../src/providers/chain/types.js";

const walletAddress = "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa";
const userId = "00000000-0000-0000-0000-000000000999";

async function createBasePolicy(services: ReturnType<typeof createServices>): Promise<Policy> {
  return services.policy.create(userId, {
    walletAddress,
    name: "Test Policy",
    description: "Task service policy",
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
    emergencyPaused: false,
    status: "ACTIVE"
  });
}

class FailingSimulationChainProvider implements ChainProvider {
  async prepare(action: ProposedAction, from: string): Promise<PreparedExecution> {
    return {
      request: {
        from,
        to: action.targetContractAddress ?? "0x3333333333333333333333333333333333333333",
        data: action.calldata,
        valueWei: "100000000000000000",
        gasLimit: "210000",
        chainId: 97,
        nonce: null
      } satisfies ExecutionRequest,
      summary: action.label
    };
  }

  async simulate(): Promise<SimulationResult> {
    return {
      success: false,
      status: "FAILED",
      error: "forced execution-guard failure",
      gasEstimate: null,
      logs: ["forced failure"]
    };
  }

  async broadcast() {
    return {
      success: true,
      txHash: "0xtest",
      error: null
    };
  }
}

class SuccessfulChainProvider implements ChainProvider {
  async prepare(action: ProposedAction, from: string): Promise<PreparedExecution> {
    return {
      request: {
        from,
        to: action.targetContractAddress ?? "0x3333333333333333333333333333333333333333",
        data: action.calldata,
        valueWei: "100000000000000000",
        gasLimit: "210000",
        chainId: 97,
        nonce: null
      } satisfies ExecutionRequest,
      summary: action.label
    };
  }

  async simulate(): Promise<SimulationResult> {
    return {
      success: true,
      status: "PASSED",
      error: null,
      gasEstimate: "21000",
      logs: ["estimateGas=21000"]
    };
  }

  async broadcast() {
    return {
      success: true,
      txHash: "0xsuccessful",
      error: null
    };
  }
}

class FailingAIProvider implements AIProvider {
  async parseIntent(): Promise<Intent> {
    throw new HttpError(502, "Anthropic provider request failed", { reason: "mocked upstream outage" });
  }

  async planActions(): Promise<ProposedAction[]> {
    throw new HttpError(502, "Anthropic provider request failed", { reason: "mocked upstream outage" });
  }

  async translatePolicy(): Promise<Partial<Policy>> {
    throw new HttpError(502, "Anthropic provider request failed", { reason: "mocked upstream outage" });
  }

  async explainRisk(): Promise<RiskExplanation> {
    throw new HttpError(502, "Anthropic provider request failed", { reason: "mocked upstream outage" });
  }
}

test("TaskService returns clarification-needed task for ambiguous launch goal", async () => {
  const services = createServices({ repositories: createRepositories() });
  const policy = await createBasePolicy(services);

  const task = await services.task.createTask(userId, walletAddress, {
    policyId: policy.id,
    goal: "Help me launch"
  });

  assert.equal(task.status, "NEEDS_CLARIFICATION");
  assert.equal(task.actions.length, 0);
  assert.equal(task.parsedIntent?.clarificationNeeded, true);
});

test("TaskService produces structured Deadhand veto receipts for blocked actions", async () => {
  const services = createServices({ repositories: createRepositories() });
  const policy = await createBasePolicy(services);

  const task = await services.task.createTask(userId, walletAddress, {
    policyId: policy.id,
    goal: "Help me set up launch liquidity using about 2 BNB total"
  });

  const blockedAction = task.actions.find((action) => action.policyDecision === "BLOCKED");
  assert.ok(blockedAction);
  assert.equal(blockedAction?.decisionReceipt?.primaryReasonCode, "POLICY_VETO_MAX_TRANSACTION");
  assert.equal(blockedAction?.decisionReceipt?.severity, "CRITICAL");
  assert.ok(blockedAction?.safetyCard);
});

test("TaskService cancels unresolved actions on task cancel", async () => {
  const services = createServices({ repositories: createRepositories() });
  const policy = await createBasePolicy(services);

  const task = await services.task.createTask(userId, walletAddress, {
    policyId: policy.id,
    goal: "Help me set up launch liquidity using about 2 BNB total"
  });

  const cancelled = await services.task.cancelTask(userId, task.id!);

  assert.equal(cancelled.status, "CANCELLED");
  assert.ok(cancelled.actions.every((action) => action.status === "CANCELLED"));
});

test("PolicyService compiles natural-language policy intent into a deterministic receipt", async () => {
  const services = createServices({ repositories: createRepositories() });
  const receipt = await services.policy.compilePolicy(userId, walletAddress, {
    text: "Keep buys under 0.5 BNB and require approval above 0.1 BNB.",
    presetKey: "launch-guard-safe"
  });

  assert.equal(receipt.validation.valid, true);
  assert.equal(receipt.enforceableArtifact.artifactType, "DEADHAND_POLICY_V1");
  assert.ok(receipt.compiledRules.length > 0);
});

test("AIService falls back to mock provider when the primary provider fails", async () => {
  const services = createServices({
    repositories: createRepositories(),
    aiProvider: new FailingAIProvider()
  });

  const receipt = await services.policy.compilePolicy(userId, walletAddress, {
    text: "Keep buys under 0.5 BNB and require approval above 0.1 BNB.",
    presetKey: "launch-guard-safe"
  });
  assert.equal(receipt.validation.valid, true);

  const policy = await createBasePolicy(services);
  const task = await services.task.createTask(userId, walletAddress, {
    policyId: policy.id,
    goal: "Swap 0.05 BNB for CAKE on PancakeSwap"
  });

  assert.equal(task.status, "ACTIVE");
  assert.ok(task.actions.length > 0);
});

test("TaskService blocks execution of blocked actions", async () => {
  const services = createServices({ repositories: createRepositories() });
  const policy = await createBasePolicy(services);

  const task = await services.task.createTask(userId, walletAddress, {
    policyId: policy.id,
    goal: "Help me set up launch liquidity using about 2 BNB total"
  });
  const blockedAction = task.actions.find((action) => action.policyDecision === "BLOCKED");
  assert.ok(blockedAction);

  await assert.rejects(
    () =>
      services.task.executeAction(userId, walletAddress, task.id!, blockedAction!.id!, {
        signedPayload: "0xsigned"
      }),
    /Blocked actions cannot execute/
  );
});

test("TaskService requires approval before executing approval-gated actions", async () => {
  const services = createServices({ repositories: createRepositories() });
  const policy = await services.policy.create(userId, {
    walletAddress,
    name: "Approval Policy",
    description: "Force approval threshold",
    approvalThresholdBnb: "0.05",
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
    emergencyPaused: false,
    status: "ACTIVE"
  });

  const task = await services.task.createTask(userId, walletAddress, {
    policyId: policy.id,
    goal: "Help me set up launch liquidity using about 2 BNB total"
  });
  const approvalAction = task.actions.find((action) => action.policyDecision === "REQUIRES_APPROVAL");
  assert.ok(approvalAction);

  await assert.rejects(
    () =>
      services.task.executeAction(userId, walletAddress, task.id!, approvalAction!.id!, {
        signedPayload: "0xsigned"
      }),
    /must be approved before execution/
  );
});

test("TaskService marks successfully executed tasks as completed", async () => {
  const services = createServices({
    repositories: createRepositories(),
    chainProvider: new SuccessfulChainProvider()
  });
  const policy = await createBasePolicy(services);

  const task = await services.task.createTask(userId, walletAddress, {
    policyId: policy.id,
    goal: "Buy the token with 0.1 BNB after launch"
  });
  const action = task.actions.find((candidate) => candidate.policyDecision === "AUTO_APPROVED");
  assert.ok(action);

  const result = await services.task.executeAction(userId, walletAddress, task.id!, action!.id!, {
    signedPayload: "0xsigned"
  });

  assert.equal(result.execution.success, true);
  assert.equal(result.task.status, "COMPLETED");
  assert.ok(result.task.actions.some((candidate) => candidate.status === "EXECUTED"));
});

test("TaskService execution guard fails when chain simulation fails", async () => {
  const services = createServices({
    repositories: createRepositories(),
    chainProvider: new FailingSimulationChainProvider()
  });
  const policy = await createBasePolicy(services);

  const task = await services.task.createTask(userId, walletAddress, {
    policyId: policy.id,
    goal: "Buy the token with 0.1 BNB after launch"
  });
  const action = task.actions.find((candidate) => candidate.policyDecision !== "BLOCKED");
  assert.ok(action);

  const approvedTask = await services.task.approveAction(userId, task.id!, action!.id!);
  const approvedAction = approvedTask.actions.find((candidate) => candidate.id === action!.id);
  assert.equal(approvedAction?.status, "APPROVED");

  await assert.rejects(
    () =>
      services.task.executeAction(userId, walletAddress, task.id!, action!.id!, {
        signedPayload: "0xsigned"
      }),
    /Execution guard simulation failed/
  );
});
