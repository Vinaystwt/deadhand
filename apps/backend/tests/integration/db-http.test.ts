import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { privateKeyToAccount } from "viem/accounts";
import httpMocks from "node-mocks-http";
import { createApp, createServices } from "../../src/index.js";
import { prisma } from "../../src/lib/prisma.js";
import { MockChainProvider } from "../../src/providers/chain/mockChainProvider.js";

const account = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945382db6d1f0f5f6ef8f4f2c4c2f1d4b2e123");

async function resetDatabase() {
  await prisma.auditEvent.deleteMany();
  await prisma.executionRecord.deleteMany();
  await prisma.approvalRecord.deleteMany();
  await prisma.simulationResult.deleteMany();
  await prisma.proposedAction.deleteMany();
  await prisma.agentTask.deleteMany();
  await prisma.policyRule.deleteMany();
  await prisma.policy.deleteMany();
  await prisma.session.deleteMany();
  await prisma.authChallenge.deleteMany();
  await prisma.user.deleteMany();
}

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

async function createPolicy(app: ReturnType<typeof createApp>, authHeader: string, name: string) {
  const response = await invoke(app, {
    method: "POST",
    url: "/policies",
    headers: { authorization: authHeader },
    body: {
      name,
      description: `${name} description`,
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
    }
  });

  assert.equal(response.status, 201);
  return response.body;
}

test("DB-backed flow persists policy archive/delete, execution audit, and logout revocation", async () => {
  await resetDatabase();

  const services = createServices({
    chainProvider: new MockChainProvider()
  });
  const app = createApp(services);
  const authHeader = await authenticate(app);

  const archivalPolicy = await createPolicy(app, authHeader, "Archive Me");

  const archiveResponse = await invoke(app, {
    method: "POST",
    url: `/policies/${archivalPolicy.id}/archive`,
    headers: { authorization: authHeader }
  });
  assert.equal(archiveResponse.status, 200);
  assert.equal(archiveResponse.body.status, "ARCHIVED");

  const deleteResponse = await invoke(app, {
    method: "DELETE",
    url: `/policies/${archivalPolicy.id}`,
    headers: { authorization: authHeader }
  });
  assert.equal(deleteResponse.status, 204);

  const listAfterDelete = await invoke(app, {
    method: "GET",
    url: "/policies",
    headers: { authorization: authHeader }
  });
  assert.equal(listAfterDelete.status, 200);
  assert.equal(listAfterDelete.body.length, 0);

  const activePolicy = await createPolicy(app, authHeader, "Execution Policy");
  const taskResponse = await invoke(app, {
    method: "POST",
    url: "/tasks",
    headers: { authorization: authHeader },
    body: {
      policyId: activePolicy.id,
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
  assert.match(executeResponse.body.execution.explorerUrl, /testnet\.bscscan\.com\/tx\//);

  const auditListResponse = await invoke(app, {
    method: "GET",
    url: "/audit",
    headers: { authorization: authHeader },
    query: { eventType: "EXECUTION_CONFIRMED", limit: 10 }
  });
  assert.equal(auditListResponse.status, 200);
  assert.equal(auditListResponse.body.length, 1);

  const auditDetailResponse = await invoke(app, {
    method: "GET",
    url: `/audit/${auditListResponse.body[0].id}`,
    headers: { authorization: authHeader }
  });
  assert.equal(auditDetailResponse.status, 200);
  assert.equal(auditDetailResponse.body.eventType, "EXECUTION_CONFIRMED");

  const logoutResponse = await invoke(app, {
    method: "POST",
    url: "/auth/logout",
    headers: { authorization: authHeader }
  });
  assert.equal(logoutResponse.status, 200);

  const revokedResponse = await invoke(app, {
    method: "GET",
    url: "/policies",
    headers: { authorization: authHeader }
  });
  assert.equal(revokedResponse.status, 401);

  await resetDatabase();
});
