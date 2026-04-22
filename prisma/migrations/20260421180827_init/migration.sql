-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PolicyDecision" AS ENUM ('BLOCKED', 'REQUIRES_APPROVAL', 'AUTO_APPROVED');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'READY_TO_EXECUTE', 'EXECUTING', 'EXECUTED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'NEEDS_CLARIFICATION', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "SimulationStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('TASK_CREATED', 'TASK_CLARIFICATION_REQUESTED', 'TASK_CLARIFIED', 'INTENT_PARSED', 'PLAN_GENERATED', 'POLICY_EVALUATED_BLOCK', 'POLICY_EVALUATED_PASS', 'SIMULATION_PASSED', 'SIMULATION_FAILED', 'ACTION_APPROVED', 'ACTION_REJECTED', 'EXECUTION_STARTED', 'EXECUTION_CONFIRMED', 'EXECUTION_FAILED', 'POLICY_CREATED', 'POLICY_UPDATED', 'POLICY_PAUSED', 'POLICY_RESUMED', 'EMERGENCY_STOP_TRIGGERED', 'EMERGENCY_STOP_CLEARED', 'TASK_CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "walletAddress" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "PolicyStatus" NOT NULL DEFAULT 'ACTIVE',
    "emergencyPaused" BOOLEAN NOT NULL DEFAULT false,
    "approvalThresholdBnb" DECIMAL(36,18) NOT NULL,
    "maxTransactionBnb" DECIMAL(36,18) NOT NULL,
    "maxDailySpendBnb" DECIMAL(36,18) NOT NULL,
    "maxSlippageBps" INTEGER NOT NULL,
    "allowedTokenAddresses" JSONB NOT NULL,
    "blockedTokenAddresses" JSONB NOT NULL,
    "allowedContractAddresses" JSONB NOT NULL,
    "blockedContractAddresses" JSONB NOT NULL,
    "allowedActionTypes" JSONB NOT NULL,
    "blockedActionTypes" JSONB NOT NULL,
    "simulationRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyRule" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "decision" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "policyVersion" INTEGER NOT NULL,
    "naturalLanguageGoal" TEXT NOT NULL,
    "parsedIntent" JSONB,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposedAction" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "actionType" TEXT NOT NULL,
    "adapter" TEXT NOT NULL,
    "targetContract" TEXT,
    "targetToken" TEXT,
    "destinationAddress" TEXT,
    "amountBnb" DECIMAL(36,18),
    "amountTokenUnits" TEXT,
    "slippageBps" INTEGER NOT NULL,
    "estimatedCostBnb" DECIMAL(36,18) NOT NULL,
    "label" TEXT NOT NULL,
    "calldata" TEXT,
    "metadata" JSONB NOT NULL,
    "policyDecision" "PolicyDecision" NOT NULL,
    "triggeredRules" JSONB NOT NULL,
    "policyExplanation" JSONB NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "riskExplanation" TEXT NOT NULL,
    "simulationStatus" "SimulationStatus" NOT NULL DEFAULT 'PENDING',
    "status" "ActionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProposedAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationResult" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "gasEstimate" TEXT,
    "logs" JSONB NOT NULL,
    "simulatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRecord" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "decision" "ApprovalDecision" NOT NULL,
    "decidedByUserId" TEXT NOT NULL,
    "notes" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionRecord" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "txHash" TEXT,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "broadcastAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "error" TEXT,
    "gasUsed" TEXT,
    "valueWei" TEXT,
    "explorerUrl" TEXT,

    CONSTRAINT "ExecutionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT,
    "actionId" TEXT,
    "eventType" "AuditEventType" NOT NULL,
    "metadata" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "AuthChallenge_nonce_key" ON "AuthChallenge"("nonce");

-- CreateIndex
CREATE INDEX "AuthChallenge_walletAddress_idx" ON "AuthChallenge"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Session_jti_key" ON "Session"("jti");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationResult_actionId_key" ON "SimulationResult"("actionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionRecord_actionId_key" ON "ExecutionRecord"("actionId");

-- CreateIndex
CREATE INDEX "AuditEvent_timestamp_idx" ON "AuditEvent"("timestamp");

-- AddForeignKey
ALTER TABLE "AuthChallenge" ADD CONSTRAINT "AuthChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyRule" ADD CONSTRAINT "PolicyRule_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposedAction" ADD CONSTRAINT "ProposedAction_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AgentTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationResult" ADD CONSTRAINT "SimulationResult_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "ProposedAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRecord" ADD CONSTRAINT "ApprovalRecord_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "ProposedAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionRecord" ADD CONSTRAINT "ExecutionRecord_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "ProposedAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AgentTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "ProposedAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
