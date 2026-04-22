import { MockAIProvider } from "../providers/ai/mockAIProvider.js";
import { createServices } from "../index.js";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

function buildLiveVerificationPolicy(walletAddress: string) {
  return {
    name: "Live External Verification Policy",
    description: "Smallest-sensible funded verification policy for Deadhand's guarded demo wallet path",
    walletAddress,
    approvalThresholdBnb: "0.000001",
    maxTransactionBnb: "0.0001",
    maxDailySpendBnb: "0.001",
    maxSlippageBps: 50,
    allowedTokenAddresses: [],
    blockedTokenAddresses: [],
    allowedContractAddresses: [],
    blockedContractAddresses: [],
    allowedActionTypes: ["TRANSFER_NATIVE"],
    blockedActionTypes: ["BUY_TOKEN", "SELL_TOKEN", "FOUR_MEME_BUY", "FOUR_MEME_SELL", "ADD_LIQUIDITY", "APPROVE_TOKEN"],
    simulationRequired: true,
    emergencyPaused: false,
    status: "ACTIVE" as const
  };
}

async function main() {
  const services = createServices({ aiProvider: new MockAIProvider() });
  const walletAddress = services.demoWallet.getAddress();

  if (!walletAddress) {
    throw new Error("Demo wallet is not configured");
  }

  const walletStatus = await services.demoWallet.getStatus();
  if (!walletStatus.funded) {
    throw new Error("Demo wallet is not funded");
  }

  const challenge = await services.auth.issueChallenge(walletAddress);
  const signature = await services.demoWallet.signAuthMessage(challenge.message);
  const verified = await services.auth.verify(walletAddress, signature);
  const session = await services.auth.authenticateToken(verified.token);

  const policy = await services.policy.create(session.userId, buildLiveVerificationPolicy(walletAddress));
  const task = await services.task.createTask(session.userId, walletAddress, {
    policyId: policy.id!,
    goal: `Transfer 0 BNB to ${walletAddress} as a live guarded verification ping`
  });

  if (task.actions.length !== 1) {
    throw new Error(`Expected exactly one action, received ${task.actions.length}`);
  }

  const action = task.actions[0];
  const execution = await services.task.executeAction(session.userId, walletAddress, task.id!, action.id!, {
    useDemoWallet: true
  });

  const replay = await services.story.buildTaskStory(session.userId, task.id!);
  const exported = await services.story.exportTaskStory(session.userId, task.id!);
  const auditEvents = await services.audit.listByUser(session.userId, {
    taskId: task.id!,
    limit: 50
  });

  const executionRecord = await prisma.executionRecord.findUnique({
    where: { actionId: action.id! }
  });

  console.log(
    JSON.stringify(
      {
        walletStatus,
        auth: {
          challengeIssued: Boolean(challenge.nonce),
          tokenIssued: Boolean(verified.token),
          sessionJti: session.jti
        },
        policy: {
          id: policy.id,
          status: policy.status,
          approvalThresholdBnb: policy.approvalThresholdBnb,
          maxTransactionBnb: policy.maxTransactionBnb
        },
        task: {
          id: task.id,
          status: execution.task.status,
          actionCount: execution.task.actions.length
        },
        action: {
          id: action.id,
          label: action.label,
          decision: action.policyDecision,
          safetyCard: action.safetyCard,
          decisionReceipt: action.decisionReceipt
        },
        execution: execution.execution,
        executionRecord,
        replay: {
          generatedAt: replay.generatedAt,
          stepCount: replay.steps.length,
          stepTypes: replay.steps.map((step) => step.type)
        },
        exportPreview: exported.markdown.split("\n").slice(0, 20).join("\n"),
        audit: {
          eventCount: auditEvents.length,
          eventTypes: auditEvents.map((event) => event.eventType)
        },
        explorerUrl: execution.execution.explorerUrl ?? (execution.execution.txHash ? `${env.BSC_SCAN_BASE_URL}/tx/${execution.execution.txHash}` : null)
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
