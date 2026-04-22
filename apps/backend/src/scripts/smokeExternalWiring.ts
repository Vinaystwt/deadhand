import { parseEther, zeroAddress } from "viem";
import { policySchema, proposedActionSchema, type Policy, type ProposedAction } from "@deadhand/types";
import { createRepositories } from "../lib/memoryStore.js";
import { evaluatePolicy } from "../domain/policy.js";
import { AuthService } from "../services/auth/authService.js";
import { DemoWalletService } from "../services/demoWallet/demoWalletService.js";
import { ExecutionService } from "../services/execution/executionService.js";
import { ViemChainProvider } from "../providers/chain/viemChainProvider.js";
import { env } from "../config/env.js";

function buildPolicy(walletAddress: string): Policy {
  return policySchema.parse({
    userId: "40000000-0000-0000-0000-000000000001",
    walletAddress,
    name: "Demo Wallet Policy",
    description: "Verification-only policy for the demo wallet path",
    version: 1,
    status: "ACTIVE",
    emergencyPaused: false,
    approvalThresholdBnb: "0.000001",
    maxTransactionBnb: "0.001",
    maxDailySpendBnb: "0.01",
    maxSlippageBps: 100,
    allowedTokenAddresses: [],
    blockedTokenAddresses: [],
    allowedContractAddresses: [],
    blockedContractAddresses: [zeroAddress],
    allowedActionTypes: ["TRANSFER_NATIVE"],
    blockedActionTypes: [],
    simulationRequired: true
  });
}

function buildSelfTransferAction(walletAddress: string): ProposedAction {
  return proposedActionSchema.parse({
    order: 1,
    actionType: "TRANSFER_NATIVE",
    adapter: "DIRECT",
    targetContractAddress: null,
    targetTokenAddress: null,
    destinationAddress: walletAddress,
    amountBnb: "0",
    amountTokenUnits: null,
    slippageBps: 0,
    estimatedCostBnb: "0",
    label: "Zero-value self-transfer readiness check",
    calldata: null,
    metadata: {
      source: "external-wiring-smoke",
      purpose: "demo-wallet-readiness"
    }
  });
}

async function verifyAuthWithDemoWallet(demoWallet: DemoWalletService) {
  const repositories = createRepositories();
  const auth = new AuthService(repositories.authChallenges, repositories.users, repositories.sessions);
  const address = demoWallet.getAddress();

  if (!address) {
    throw new Error("Demo wallet is not configured");
  }

  const challenge = await auth.issueChallenge(address);
  const signature = await demoWallet.signAuthMessage(challenge.message);
  const verified = await auth.verify(address, signature);
  const payload = await auth.authenticateToken(verified.token);
  await auth.logout(payload.jti);

  let revoked = false;
  try {
    await auth.authenticateToken(verified.token);
  } catch {
    revoked = true;
  }

  return {
    walletAddress: address,
    challengeIssued: Boolean(challenge.nonce),
    tokenIssued: Boolean(verified.token),
    tokenRevokedAfterLogout: revoked
  };
}

async function verifyDemoWalletExecutionPath(demoWallet: DemoWalletService) {
  const address = demoWallet.getAddress();
  if (!address) {
    throw new Error("Demo wallet is not configured");
  }

  const execution = new ExecutionService(new ViemChainProvider(), demoWallet);
  const policy = buildPolicy(address);
  const action = buildSelfTransferAction(address);
  const policyCheck = evaluatePolicy(policy, action, { spentTodayBnb: "0" });
  const request = await execution.prepareAction(action, address);
  const simulation = await execution.simulatePrepared(request);
  const status = await demoWallet.getStatus();

  let liveBroadcastAttempted = false;
  let liveBroadcastResult: {
    success: boolean;
    txHash: string | null;
    gasUsed: string | null | undefined;
    error: string | null;
  } | null = null;

  if (status.funded && BigInt(status.balanceWei ?? "0") > parseEther("0.00002")) {
    liveBroadcastAttempted = true;
    try {
      const result = await execution.executeWithDemoWallet(request, address);
      liveBroadcastResult = {
        success: result.success,
        txHash: result.txHash,
        gasUsed: result.gasUsed,
        error: result.error
      };
    } catch (error) {
      liveBroadcastResult = {
        success: false,
        txHash: null,
        gasUsed: null,
        error: error instanceof Error ? error.message : "Unknown broadcast failure"
      };
    }
  }

  return {
    policyDecision: policyCheck.decision,
    simulation,
    requestSummary: {
      from: request.from,
      to: request.to,
      valueWei: request.valueWei,
      chainId: request.chainId
    },
    walletStatus: status,
    liveBroadcastAttempted,
    liveBroadcastResult
  };
}

async function main() {
  const demoWallet = new DemoWalletService();
  const authStatus = await verifyAuthWithDemoWallet(demoWallet);
  const executionStatus = await verifyDemoWalletExecutionPath(demoWallet);

  console.log(
    JSON.stringify(
      {
        jwtConfigured: env.JWT_SECRET.length >= 32,
        authStatus,
        executionStatus
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
