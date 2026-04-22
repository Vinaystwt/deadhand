import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { privateKeyToAccount } from "viem/accounts";
import httpMocks from "node-mocks-http";
import { createApp, createServices } from "../../src/index.js";
import { createRepositories } from "../../src/lib/memoryStore.js";
import { MockChainProvider } from "../../src/providers/chain/mockChainProvider.js";

const account = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945382db6d1f0f5f6ef8f4f2c4c2f1d4b2e123");

async function invoke(
  app: ReturnType<typeof createApp>,
  input: {
    method: string;
    url: string;
    body?: unknown;
    headers?: Record<string, string>;
    query?: Record<string, string | number>;
  }
) {
  const req = httpMocks.createRequest({
    method: input.method as any,
    url: input.url,
    body: input.body as any,
    headers: input.headers,
    query: input.query
  });
  const res = httpMocks.createResponse({ eventEmitter: EventEmitter });

  await new Promise<void>((resolve, reject) => {
    res.on("end", resolve);
    res.on("finish", resolve);
    res.on("error", reject);
    (app as any).handle(req, res, reject);
  });

  const body = res._isJSON() ? res._getJSONData() : res._getData();
  return {
    status: res.statusCode,
    body
  };
}

async function authenticate(app: ReturnType<typeof createApp>) {
  const challengeResponse = await invoke(app, {
    method: "POST",
    url: "/auth/challenge",
    body: { walletAddress: account.address }
  });

  assert.equal(challengeResponse.status, 200);
  assert.ok(challengeResponse.body.nonce);
  assert.ok(challengeResponse.body.createdAt);
  assert.ok(challengeResponse.body.expiresAt);
  assert.equal(challengeResponse.body.ttlSeconds, 300);

  const signature = await account.signMessage({ message: challengeResponse.body.message });
  const verifyResponse = await invoke(app, {
    method: "POST",
    url: "/auth/verify",
    body: {
      walletAddress: account.address,
      signature
    }
  });

  assert.equal(verifyResponse.status, 200);
  return `Bearer ${verifyResponse.body.token}`;
}

async function createPolicy(
  app: ReturnType<typeof createApp>,
  authHeader: string,
  overrides?: Partial<{
    approvalThresholdBnb: string;
  }>
) {
  const response = await invoke(app, {
    method: "POST",
    url: "/policies",
    headers: { authorization: authHeader },
    body: {
      name: "HTTP Test Policy",
      description: "Route-level policy",
      approvalThresholdBnb: overrides?.approvalThresholdBnb ?? "0.1",
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
    }
  });

  assert.equal(response.status, 201);
  return response.body;
}

test("HTTP flow supports policy pause/resume and audit filtering", async () => {
  const services = createServices({ repositories: createRepositories(), chainProvider: new MockChainProvider() });
  const app = createApp(services);
  const authHeader = await authenticate(app);
  const policy = await createPolicy(app, authHeader, { approvalThresholdBnb: "0.05" });

  const pauseResponse = await invoke(app, {
    method: "POST",
    url: `/policies/${policy.id}/pause`,
    headers: { authorization: authHeader }
  });
  assert.equal(pauseResponse.status, 200);
  assert.equal(pauseResponse.body.status, "PAUSED");

  const resumeResponse = await invoke(app, {
    method: "POST",
    url: `/policies/${policy.id}/resume`,
    headers: { authorization: authHeader }
  });
  assert.equal(resumeResponse.status, 200);
  assert.equal(resumeResponse.body.status, "ACTIVE");

  const auditResponse = await invoke(app, {
    method: "GET",
    url: "/audit",
    headers: { authorization: authHeader },
    query: { eventType: "POLICY_PAUSED", limit: 10 }
  });

  assert.equal(auditResponse.status, 200);
  assert.equal(auditResponse.body.length, 1);
  assert.equal(auditResponse.body[0].eventType, "POLICY_PAUSED");
});

test("HTTP flow exposes adapter and AI integration runtime status", async () => {
  const services = createServices({ repositories: createRepositories(), chainProvider: new MockChainProvider() });
  const app = createApp(services);

  const response = await invoke(app, {
    method: "GET",
    url: "/integrations/status"
  });

  assert.equal(response.status, 200);
  assert.ok(response.body.ai);
  assert.ok(response.body.adapters);
  assert.ok(response.body.config);
  assert.equal(typeof response.body.adapters.fourMeme.configured, "boolean");
  assert.equal(typeof response.body.adapters.pancakeSwap.configured, "boolean");
  assert.equal(response.body.adapters.pancakeSwap.routerKind, "V3_SWAP_ROUTER");
  assert.equal(typeof response.body.config.safeDemoModeReady, "boolean");
});

test("HTTP flow supports clarification and cancel endpoints", async () => {
  const services = createServices({ repositories: createRepositories(), chainProvider: new MockChainProvider() });
  const app = createApp(services);
  const authHeader = await authenticate(app);
  const policy = await createPolicy(app, authHeader);

  const ambiguousTask = await invoke(app, {
    method: "POST",
    url: "/tasks",
    headers: { authorization: authHeader },
    body: {
      policyId: policy.id,
      goal: "Help me launch"
    }
  });

  assert.equal(ambiguousTask.status, 201);
  assert.equal(ambiguousTask.body.status, "NEEDS_CLARIFICATION");
  assert.equal(ambiguousTask.body.actions.length, 0);

  const clarifiedTask = await invoke(app, {
    method: "POST",
    url: `/tasks/${ambiguousTask.body.id}/clarify`,
    headers: { authorization: authHeader },
    body: {
      answer: "Buy on Four.Meme first"
    }
  });

  assert.equal(clarifiedTask.status, 200);
  assert.equal(clarifiedTask.body.status, "ACTIVE");
  assert.ok(clarifiedTask.body.actions.length > 0);

  const taskToCancel = await invoke(app, {
    method: "POST",
    url: "/tasks",
    headers: { authorization: authHeader },
    body: {
      policyId: policy.id,
      goal: "Help me set up launch liquidity using about 2 BNB total"
    }
  });
  assert.equal(taskToCancel.status, 201);

  const cancelResponse = await invoke(app, {
    method: "POST",
    url: `/tasks/${taskToCancel.body.id}/cancel`,
    headers: { authorization: authHeader }
  });

  assert.equal(cancelResponse.status, 200);
  assert.equal(cancelResponse.body.status, "CANCELLED");
});

test("HTTP flow supports approve and execute through in-memory mock providers", async () => {
  const services = createServices({ repositories: createRepositories(), chainProvider: new MockChainProvider() });
  const app = createApp(services);
  const authHeader = await authenticate(app);
  const policy = await createPolicy(app, authHeader, { approvalThresholdBnb: "0.05" });

  const taskResponse = await invoke(app, {
    method: "POST",
    url: "/tasks",
    headers: { authorization: authHeader },
    body: {
      policyId: policy.id,
      goal: "Help me set up launch liquidity using about 2 BNB total"
    }
  });

  assert.equal(taskResponse.status, 201);
  const approvalAction = taskResponse.body.actions.find((action: { policyDecision: string }) => action.policyDecision === "REQUIRES_APPROVAL");
  assert.ok(approvalAction);

  const approveResponse = await invoke(app, {
    method: "POST",
    url: `/tasks/${taskResponse.body.id}/actions/${approvalAction.id}/approve`,
    headers: { authorization: authHeader }
  });
  assert.equal(approveResponse.status, 200);

  const executeResponse = await invoke(app, {
    method: "POST",
    url: `/tasks/${taskResponse.body.id}/actions/${approvalAction.id}/execute`,
    headers: { authorization: authHeader },
    body: {
      signedPayload: "0xdeadhand-mock-signature"
    }
  });

  assert.equal(executeResponse.status, 200);
  assert.equal(executeResponse.body.execution.success, true);

  const auditResponse = await invoke(app, {
    method: "GET",
    url: "/audit",
    headers: { authorization: authHeader },
    query: { eventType: "EXECUTION_CONFIRMED", limit: 10 }
  });

  assert.equal(auditResponse.status, 200);
  assert.equal(auditResponse.body.length, 1);
});

test("HTTP flow exposes policy presets, policy compiler receipts, replay story, and exports", async () => {
  const services = createServices({ repositories: createRepositories(), chainProvider: new MockChainProvider() });
  const app = createApp(services);
  const authHeader = await authenticate(app);

  const presetsResponse = await invoke(app, {
    method: "GET",
    url: "/policies/presets",
    headers: { authorization: authHeader }
  });
  assert.equal(presetsResponse.status, 200);
  assert.ok(presetsResponse.body.length >= 2);

  const compileResponse = await invoke(app, {
    method: "POST",
    url: "/policies/compile",
    headers: { authorization: authHeader },
    body: {
      text: "Require approval above 0.1 BNB and keep buys under 0.5 BNB.",
      presetKey: "launch-guard-safe"
    }
  });
  assert.equal(compileResponse.status, 200);
  assert.equal(compileResponse.body.validation.valid, true);

  const policy = await createPolicy(app, authHeader, { approvalThresholdBnb: "0.05" });
  const taskResponse = await invoke(app, {
    method: "POST",
    url: "/tasks",
    headers: { authorization: authHeader },
    body: {
      policyId: policy.id,
      goal: "Help me set up launch liquidity using about 2 BNB total"
    }
  });
  assert.equal(taskResponse.status, 201);

  const replayResponse = await invoke(app, {
    method: "GET",
    url: `/tasks/${taskResponse.body.id}/replay`,
    headers: { authorization: authHeader }
  });
  assert.equal(replayResponse.status, 200);
  assert.ok(replayResponse.body.steps.length > 0);
  assert.ok(replayResponse.body.steps.some((step: { type: string }) => step.type === "EXECUTION_GUARD") === false);

  const exportResponse = await invoke(app, {
    method: "GET",
    url: `/tasks/${taskResponse.body.id}/export`,
    headers: { authorization: authHeader },
    query: { format: "markdown" }
  });
  assert.equal(exportResponse.status, 200);
  assert.match(String(exportResponse.body), /Deadhand Replay Story/);
});

test("HTTP audit query supports reasonCode, severity, and storyClass filters", async () => {
  const services = createServices({ repositories: createRepositories(), chainProvider: new MockChainProvider() });
  const app = createApp(services);
  const authHeader = await authenticate(app);
  const policy = await createPolicy(app, authHeader, { approvalThresholdBnb: "0.05" });

  await invoke(app, {
    method: "POST",
    url: "/tasks",
    headers: { authorization: authHeader },
    body: {
      policyId: policy.id,
      goal: "Help me set up launch liquidity using about 2 BNB total"
    }
  });

  const byReasonCode = await invoke(app, {
    method: "GET",
    url: "/audit",
    headers: { authorization: authHeader },
    query: { reasonCode: "POLICY_VETO_MAX_TRANSACTION", limit: 20 }
  });
  assert.equal(byReasonCode.status, 200);
  assert.ok(byReasonCode.body.some((event: { metadata: { reasonCodes?: string[] } }) => event.metadata.reasonCodes?.includes("POLICY_VETO_MAX_TRANSACTION")));

  const bySeverity = await invoke(app, {
    method: "GET",
    url: "/audit",
    headers: { authorization: authHeader },
    query: { severity: "CRITICAL", storyClass: "POLICY_VETO", limit: 20 }
  });
  assert.equal(bySeverity.status, 200);
  assert.ok(bySeverity.body.length >= 1);
});

test("HTTP replay includes execution guard step after successful execute", async () => {
  const services = createServices({ repositories: createRepositories(), chainProvider: new MockChainProvider() });
  const app = createApp(services);
  const authHeader = await authenticate(app);
  const policy = await createPolicy(app, authHeader, { approvalThresholdBnb: "0.05" });

  const taskResponse = await invoke(app, {
    method: "POST",
    url: "/tasks",
    headers: { authorization: authHeader },
    body: {
      policyId: policy.id,
      goal: "Help me set up launch liquidity using about 2 BNB total"
    }
  });

  const approvalAction = taskResponse.body.actions.find((action: { policyDecision: string }) => action.policyDecision === "REQUIRES_APPROVAL");
  assert.ok(approvalAction);

  await invoke(app, {
    method: "POST",
    url: `/tasks/${taskResponse.body.id}/actions/${approvalAction.id}/approve`,
    headers: { authorization: authHeader }
  });

  await invoke(app, {
    method: "POST",
    url: `/tasks/${taskResponse.body.id}/actions/${approvalAction.id}/execute`,
    headers: { authorization: authHeader },
    body: {
      signedPayload: "0xdeadhand-mock-signature"
    }
  });

  const replayResponse = await invoke(app, {
    method: "GET",
    url: `/tasks/${taskResponse.body.id}/replay`,
    headers: { authorization: authHeader }
  });

  assert.equal(replayResponse.status, 200);
  assert.ok(replayResponse.body.steps.some((step: { type: string; title: string }) => step.type === "EXECUTION_GUARD" && /recheck passed/i.test(step.title)));
});

test("HTTP emergency stop cancels pending work and returns kill-switch metadata", async () => {
  const services = createServices({ repositories: createRepositories(), chainProvider: new MockChainProvider() });
  const app = createApp(services);
  const authHeader = await authenticate(app);
  const policy = await createPolicy(app, authHeader);

  const taskResponse = await invoke(app, {
    method: "POST",
    url: "/tasks",
    headers: { authorization: authHeader },
    body: {
      policyId: policy.id,
      goal: "Buy the token with 0.1 BNB after launch"
    }
  });
  assert.equal(taskResponse.status, 201);

  const stopResponse = await invoke(app, {
    method: "POST",
    url: "/emergency-stop",
    headers: { authorization: authHeader }
  });
  assert.equal(stopResponse.status, 200);
  assert.ok(stopResponse.body.cancelled.actionCount >= 1);

  const statusAfterStop = await invoke(app, {
    method: "GET",
    url: "/emergency-status",
    headers: { authorization: authHeader }
  });
  assert.equal(statusAfterStop.status, 200);
  assert.equal(statusAfterStop.body.emergencyStopped, true);

  const resumeResponse = await invoke(app, {
    method: "POST",
    url: "/emergency-resume",
    headers: { authorization: authHeader }
  });
  assert.equal(resumeResponse.status, 200);
  assert.equal(resumeResponse.body.emergencyStopped, false);

  const statusAfterResume = await invoke(app, {
    method: "GET",
    url: "/emergency-status",
    headers: { authorization: authHeader }
  });
  assert.equal(statusAfterResume.status, 200);
  assert.equal(statusAfterResume.body.emergencyStopped, false);
});
