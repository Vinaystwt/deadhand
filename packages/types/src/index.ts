import { z } from "zod";

export const policyStatusSchema = z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]);
export const policyDecisionSchema = z.enum(["BLOCKED", "REQUIRES_APPROVAL", "AUTO_APPROVED"]);
export const actionStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "READY_TO_EXECUTE",
  "EXECUTING",
  "EXECUTED",
  "FAILED",
  "CANCELLED"
]);
export const taskStatusSchema = z.enum([
  "PENDING",
  "NEEDS_CLARIFICATION",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "FAILED"
]);
export const simulationStatusSchema = z.enum(["PENDING", "PASSED", "FAILED", "SKIPPED"]);
export const riskLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "BLOCKED"]);
export const approvalDecisionSchema = z.enum(["APPROVED", "REJECTED"]);
export const executionStatusSchema = z.enum(["PENDING", "CONFIRMED", "FAILED", "TIMEOUT"]);
export const aiProviderSchema = z.enum(["mock", "anthropic", "openai"]);
export const severitySchema = z.enum(["INFO", "WARNING", "HIGH", "CRITICAL"]);
export const driftStatusSchema = z.enum(["LOCKED", "DRIFT_BLOCKED"]);
export const exportFormatSchema = z.enum(["json", "markdown"]);
export const storyClassSchema = z.enum([
  "GOAL",
  "INTENT",
  "ACTION_PLAN",
  "POLICY_VETO",
  "APPROVAL_GATE",
  "SIMULATION",
  "EXECUTION_GUARD",
  "EXECUTION_RESULT",
  "EMERGENCY_STOP",
  "POLICY_COMPILER",
  "AUDIT_EXPORT"
]);

export const actionTypeSchema = z.enum([
  "BUY_TOKEN",
  "SELL_TOKEN",
  "TRANSFER_NATIVE",
  "TRANSFER_TOKEN",
  "APPROVE_TOKEN",
  "ADD_LIQUIDITY",
  "FOUR_MEME_BUY",
  "FOUR_MEME_SELL"
]);

export const ruleTypeSchema = z.enum([
  "MAX_TRANSACTION_BNB",
  "MAX_DAILY_SPEND_BNB",
  "ALLOWED_TOKEN_LIST",
  "BLOCKED_TOKEN_LIST",
  "ALLOWED_CONTRACTS",
  "BLOCKED_CONTRACTS",
  "ALLOWED_ACTION_TYPES",
  "BLOCKED_ACTION_TYPES",
  "MAX_SLIPPAGE_BPS",
  "APPROVAL_THRESHOLD_BNB",
  "EMERGENCY_PAUSED"
]);

export const reasonCodeSchema = z.enum([
  "POLICY_VETO_MAX_TRANSACTION",
  "POLICY_VETO_MAX_DAILY_SPEND",
  "POLICY_VETO_TOKEN_NOT_ALLOWED",
  "POLICY_VETO_TOKEN_BLOCKLIST",
  "POLICY_VETO_CONTRACT_NOT_ALLOWED",
  "POLICY_VETO_CONTRACT_BLOCKLIST",
  "POLICY_VETO_ACTION_NOT_ALLOWED",
  "POLICY_VETO_ACTION_BLOCKLIST",
  "POLICY_VETO_SLIPPAGE_EXCEEDED",
  "POLICY_VETO_EMERGENCY_PAUSED",
  "POLICY_REQUIRES_APPROVAL_THRESHOLD",
  "POLICY_AUTO_APPROVED_WITHIN_SCOPE",
  "SIMULATION_PASSED",
  "SIMULATION_FAILED",
  "EXECUTION_GUARD_PASSED",
  "EXECUTION_DRIFT_BLOCKED",
  "EXECUTION_CONFIRMED_GUARDED",
  "EXECUTION_FAILED_GUARDED",
  "EMERGENCY_KILL_SWITCH_TRIGGERED",
  "EMERGENCY_KILL_SWITCH_CLEARED",
  "TASK_NEEDS_CLARIFICATION",
  "POLICY_COMPILER_VALID",
  "POLICY_COMPILER_INVALID",
  "AUDIT_STORY_EXPORTED"
]);

export const auditEventTypeSchema = z.enum([
  "TASK_CREATED",
  "TASK_CLARIFICATION_REQUESTED",
  "TASK_CLARIFIED",
  "INTENT_PARSED",
  "PLAN_GENERATED",
  "POLICY_COMPILED",
  "POLICY_EVALUATED_BLOCK",
  "POLICY_EVALUATED_PASS",
  "SIMULATION_PASSED",
  "SIMULATION_FAILED",
  "ACTION_APPROVED",
  "ACTION_REJECTED",
  "EXECUTION_STARTED",
  "EXECUTION_CONFIRMED",
  "EXECUTION_FAILED",
  "POLICY_CREATED",
  "POLICY_UPDATED",
  "POLICY_PAUSED",
  "POLICY_RESUMED",
  "AUDIT_EXPORTED",
  "EMERGENCY_STOP_TRIGGERED",
  "EMERGENCY_STOP_CLEARED",
  "TASK_CANCELLED"
]);

export const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Expected EVM address");

export const attemptedActionSummarySchema = z
  .object({
    actionType: actionTypeSchema,
    adapter: z.enum(["FOUR_MEME", "PANCAKESWAP", "DIRECT", "MOCK"]),
    label: z.string(),
    estimatedCostBnb: z.string(),
    targetContractAddress: addressSchema.nullable(),
    targetTokenAddress: addressSchema.nullable(),
    destinationAddress: addressSchema.nullable(),
    slippageBps: z.number().int().min(0).max(5000)
  })
  .strict();

export const decisionTriggerSchema = z
  .object({
    ruleType: ruleTypeSchema,
    reasonCode: reasonCodeSchema,
    severity: severitySchema,
    field: z.string(),
    operator: z.string(),
    expected: z.unknown().optional(),
    actual: z.unknown().optional(),
    triggerPath: z.string(),
    humanExplanation: z.string(),
    machineExplanation: z.string(),
    safeAlternative: z.string().nullable().default(null),
    requiredCorrection: z.string().nullable().default(null)
  })
  .strict();

export const decisionReceiptSchema = z
  .object({
    decision: policyDecisionSchema,
    primaryReasonCode: reasonCodeSchema,
    reasonCodes: z.array(reasonCodeSchema).min(1),
    severity: severitySchema,
    humanExplanation: z.string(),
    machineExplanation: z.string(),
    attempted: attemptedActionSummarySchema,
    triggers: z.array(decisionTriggerSchema).min(1),
    safeAlternative: z.string().nullable().default(null),
    requiredCorrection: z.string().nullable().default(null)
  })
  .strict();

export const executionEnvelopeSchema = z
  .object({
    actionType: actionTypeSchema,
    adapter: z.enum(["FOUR_MEME", "PANCAKESWAP", "DIRECT", "MOCK"]),
    chainId: z.number().int().positive(),
    from: addressSchema,
    to: addressSchema,
    valueWei: z.string(),
    calldataFingerprint: z.string(),
    targetContractAddress: addressSchema.nullable(),
    targetTokenAddress: addressSchema.nullable()
  })
  .strict();

export const driftReceiptSchema = z
  .object({
    status: driftStatusSchema,
    reasonCode: reasonCodeSchema,
    humanExplanation: z.string(),
    machineExplanation: z.string(),
    expected: executionEnvelopeSchema,
    actual: executionEnvelopeSchema
  })
  .strict();

export const safetyCardSchema = z
  .object({
    estimatedSpendBnb: z.string(),
    valueAtRiskBnb: z.string(),
    contractsTouched: z.array(addressSchema),
    tokensTouched: z.array(addressSchema),
    approvalScope: z.string(),
    simulationResult: z.object({
      status: simulationStatusSchema,
      success: z.boolean(),
      gasEstimate: z.string().nullable(),
      error: z.string().nullable()
    }),
    riskSummary: z.string(),
    reasonCodes: z.array(reasonCodeSchema),
    approvalRequired: z.boolean(),
    killSwitchActive: z.boolean()
  })
  .strict();

export const policyCompilerReceiptSchema = z
  .object({
    originalIntent: z.string(),
    presetKey: z.string().nullable().default(null),
    presetName: z.string().nullable().default(null),
    compiledPolicy: z.record(z.unknown()),
    compiledRules: z.array(
      z.object({
        ruleType: ruleTypeSchema,
        decision: z.enum(["BLOCK", "WARN", "REQUIRES_APPROVAL"]),
        explanation: z.string()
      })
    ),
    validation: z.object({
      valid: z.boolean(),
      reasonCode: reasonCodeSchema,
      errors: z.array(z.string()).default([])
    }),
    structuredRuleSummary: z.array(z.string()),
    enforceableArtifact: z.object({
      artifactType: z.literal("DEADHAND_POLICY_V1"),
      compilerVersion: z.literal("1"),
      ruleCount: z.number().int().nonnegative()
    })
  })
  .strict();

export const replayStoryStepSchema = z
  .object({
    type: z.enum([
      "GOAL",
      "INTENT",
      "ACTION_PLAN",
      "DEADHAND_VETO",
      "APPROVAL_GATE",
      "SIMULATION",
      "EXECUTION_GUARD",
      "EXECUTION_RESULT",
      "EMERGENCY_STOP",
      "AUDIT_EXPORT"
    ]),
    title: z.string(),
    reasonCodes: z.array(reasonCodeSchema).default([]),
    summary: z.string(),
    payload: z.record(z.unknown()).default({})
  })
  .strict();

export const replayStorySchema = z
  .object({
    taskId: z.string().uuid(),
    policyId: z.string().uuid(),
    goal: z.string(),
    status: taskStatusSchema,
    steps: z.array(replayStoryStepSchema),
    generatedAt: z.string().datetime()
  })
  .strict();

export const policySchema = z
  .object({
    id: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    walletAddress: addressSchema,
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    version: z.number().int().positive().default(1),
    status: policyStatusSchema.default("ACTIVE"),
    emergencyPaused: z.boolean().default(false),
    approvalThresholdBnb: z.string().default("0.1"),
    maxTransactionBnb: z.string().default("0.5"),
    maxDailySpendBnb: z.string().default("2.0"),
    maxSlippageBps: z.number().int().min(1).max(5000).default(100),
    allowedTokenAddresses: z.array(addressSchema).default([]),
    blockedTokenAddresses: z.array(addressSchema).default([]),
    allowedContractAddresses: z.array(addressSchema).default([]),
    blockedContractAddresses: z.array(addressSchema).default([]),
    allowedActionTypes: z.array(actionTypeSchema).default([]),
    blockedActionTypes: z.array(actionTypeSchema).default([]),
    simulationRequired: z.boolean().default(true),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional()
  })
  .strict();

export const policyRuleSchema = z
  .object({
    id: z.string().uuid().optional(),
    policyId: z.string().uuid().optional(),
    ruleType: ruleTypeSchema,
    field: z.string(),
    operator: z.enum(["LT", "GT", "LTE", "GTE", "EQ", "IN", "NOT_IN", "IS_TRUE"]),
    value: z.unknown(),
    decision: z.enum(["BLOCK", "WARN", "REQUIRES_APPROVAL"]),
    explanation: z.string(),
    isActive: z.boolean().default(true),
    createdAt: z.string().datetime().optional()
  })
  .strict();

export const intentSchema = z
  .object({
    goalType: z.enum(["BUY", "SELL", "TRANSFER", "ADD_LIQUIDITY", "LAUNCH_SUPPORT"]),
    targetTokenAddress: addressSchema.nullable(),
    targetTokenSymbol: z.string().nullable(),
    totalBudgetBnb: z.string().nullable(),
    operationType: z.enum(["SINGLE", "MULTI_STEP"]),
    constraints: z.array(z.string()).default([]),
    clarificationNeeded: z.boolean().default(false),
    clarificationQuestion: z.string().nullable().default(null)
  })
  .strict();

export const proposedActionSchema = z
  .object({
    id: z.string().uuid().optional(),
    order: z.number().int().positive(),
    actionType: actionTypeSchema,
    adapter: z.enum(["FOUR_MEME", "PANCAKESWAP", "DIRECT", "MOCK"]),
    targetContractAddress: addressSchema.nullable(),
    targetTokenAddress: addressSchema.nullable(),
    destinationAddress: addressSchema.nullable(),
    amountBnb: z.string().nullable(),
    amountTokenUnits: z.string().nullable(),
    slippageBps: z.number().int().min(0).max(5000),
    estimatedCostBnb: z.string(),
    label: z.string(),
    calldata: z.string().nullable().default(null),
    metadata: z.record(z.unknown()).default({})
  })
  .strict();

export const policyCheckResultSchema = z
  .object({
    decision: policyDecisionSchema,
    triggeredRules: z.array(decisionTriggerSchema),
    explanation: z.array(z.string()),
    reasonCodes: z.array(reasonCodeSchema).default([]),
    receipt: decisionReceiptSchema.nullable().default(null)
  })
  .strict();

export const simulationResultSchema = z
  .object({
    success: z.boolean(),
    status: simulationStatusSchema,
    error: z.string().nullable(),
    gasEstimate: z.string().nullable(),
    logs: z.array(z.string()).default([])
  })
  .strict();

export const riskExplanationSchema = z
  .object({
    riskLevel: riskLevelSchema,
    explanation: z.string().max(240)
  })
  .strict();

export const agentTaskSchema = z
  .object({
    id: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    policyId: z.string().uuid(),
    policyVersion: z.number().int().positive(),
    naturalLanguageGoal: z.string().min(1),
    parsedIntent: intentSchema.optional(),
    status: taskStatusSchema.default("PENDING"),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional()
  })
  .strict();

export const executionRequestSchema = z
  .object({
    from: addressSchema,
    to: addressSchema,
    data: z.string().nullable(),
    valueWei: z.string(),
    gasLimit: z.string().nullable(),
    chainId: z.number().int().positive(),
    nonce: z.number().int().nonnegative().nullable()
  })
  .strict();

export const approvalRecordSchema = z.object({
  actionId: z.string().uuid(),
  decision: approvalDecisionSchema,
  notes: z.string().nullable().optional()
});

export const auditEventSchema = z
  .object({
    id: z.string().uuid().optional(),
    userId: z.string().uuid(),
    taskId: z.string().uuid().nullable().optional(),
    actionId: z.string().uuid().nullable().optional(),
    eventType: auditEventTypeSchema,
    metadata: z.record(z.unknown()).default({}),
    timestamp: z.string().datetime().optional()
  })
  .strict();

export const createPolicyRequestSchema = policySchema.omit({
  id: true,
  userId: true,
  version: true,
  createdAt: true,
  updatedAt: true
});

export const compilePolicyRequestSchema = z.object({
  text: z.string().min(1),
  presetKey: z.string().optional()
});

export const createTaskRequestSchema = z.object({
  policyId: z.string().uuid(),
  goal: z.string().min(1)
});

export const clarifyTaskRequestSchema = z.object({
  answer: z.string().min(1)
});

export const auditQuerySchema = z.object({
  taskId: z.string().uuid().optional(),
  actionId: z.string().uuid().optional(),
  eventType: auditEventTypeSchema.optional(),
  reasonCode: reasonCodeSchema.optional(),
  severity: severitySchema.optional(),
  storyClass: storyClassSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(200).default(100)
});

export const taskExportQuerySchema = z.object({
  format: exportFormatSchema.default("json")
});

export type Policy = z.infer<typeof policySchema>;
export type PolicyRule = z.infer<typeof policyRuleSchema>;
export type Intent = z.infer<typeof intentSchema>;
export type ProposedAction = z.infer<typeof proposedActionSchema>;
export type PolicyCheckResult = z.infer<typeof policyCheckResultSchema>;
export type SimulationResult = z.infer<typeof simulationResultSchema>;
export type RiskExplanation = z.infer<typeof riskExplanationSchema>;
export type AgentTask = z.infer<typeof agentTaskSchema>;
export type AuditEvent = z.infer<typeof auditEventSchema>;
export type ExecutionRequest = z.infer<typeof executionRequestSchema>;
export type ApprovalRecord = z.infer<typeof approvalRecordSchema>;
export type CreatePolicyRequest = z.infer<typeof createPolicyRequestSchema>;
export type CompilePolicyRequest = z.infer<typeof compilePolicyRequestSchema>;
export type CreateTaskRequest = z.infer<typeof createTaskRequestSchema>;
export type ClarifyTaskRequest = z.infer<typeof clarifyTaskRequestSchema>;
export type AuditQuery = z.infer<typeof auditQuerySchema>;
export type PolicyDecision = z.infer<typeof policyDecisionSchema>;
export type ActionType = z.infer<typeof actionTypeSchema>;
export type RuleType = z.infer<typeof ruleTypeSchema>;
export type AIProvider = z.infer<typeof aiProviderSchema>;
export type ReasonCode = z.infer<typeof reasonCodeSchema>;
export type Severity = z.infer<typeof severitySchema>;
export type DecisionTrigger = z.infer<typeof decisionTriggerSchema>;
export type DecisionReceipt = z.infer<typeof decisionReceiptSchema>;
export type ExecutionEnvelope = z.infer<typeof executionEnvelopeSchema>;
export type DriftReceipt = z.infer<typeof driftReceiptSchema>;
export type SafetyCard = z.infer<typeof safetyCardSchema>;
export type PolicyCompilerReceipt = z.infer<typeof policyCompilerReceiptSchema>;
export type ReplayStory = z.infer<typeof replayStorySchema>;
export type ReplayStoryStep = z.infer<typeof replayStoryStepSchema>;
export type StoryClass = z.infer<typeof storyClassSchema>;
