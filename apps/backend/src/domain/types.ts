import type {
  AgentTask,
  ApprovalRecord,
  AuditEvent,
  AuditQuery,
  DecisionReceipt,
  DriftReceipt,
  ExecutionEnvelope,
  Policy,
  ProposedAction,
  ReplayStory,
  SafetyCard,
  SimulationResult
} from "@deadhand/types";

export interface TaskActionView extends ProposedAction {
  policyDecision: "BLOCKED" | "REQUIRES_APPROVAL" | "AUTO_APPROVED";
  policyExplanation: string[];
  triggeredRules: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "BLOCKED";
  riskExplanation: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "READY_TO_EXECUTE" | "EXECUTING" | "EXECUTED" | "FAILED" | "CANCELLED";
  simulation: SimulationResult;
  decisionReceipt?: DecisionReceipt | null;
  safetyCard?: SafetyCard | null;
  approvedExecutionEnvelope?: ExecutionEnvelope | null;
  driftReceipt?: DriftReceipt | null;
}

export interface TaskDetails extends AgentTask {
  policy: Policy;
  actions: TaskActionView[];
}

export interface Repositories {
  authChallenges: AuthChallengeRepository;
  sessions: SessionRepository;
  users: UserRepository;
  policies: PolicyRepository;
  tasks: TaskRepository;
  approvals: ApprovalRepository;
  executions: ExecutionRepository;
  audit: AuditRepository;
}

export interface AuthChallengeRepository {
  create(
    walletAddress: string,
    challenge: { nonce: string; message: string; createdAt: string; expiresAt: string }
  ): Promise<void>;
  consume(walletAddress: string, nowIso: string): Promise<{ nonce: string; message: string } | null>;
}

export interface SessionRepository {
  create(input: { userId: string; jti: string; expiresAt: string }): Promise<void>;
  getActiveSession(jti: string): Promise<{ userId: string; jti: string; expiresAt: string } | null>;
  revoke(jti: string): Promise<void>;
}

export interface UserRepository {
  findOrCreate(walletAddress: string): Promise<{ id: string; walletAddress: string }>;
}

export interface PolicyRepository {
  listByUser(userId: string): Promise<Policy[]>;
  getById(policyId: string): Promise<Policy | null>;
  create(policy: Policy): Promise<Policy>;
  update(policyId: string, policy: Policy): Promise<Policy>;
  archive(policyId: string, userId: string): Promise<Policy>;
  delete(policyId: string, userId: string): Promise<void>;
  pauseAll(userId: string, paused: boolean): Promise<number>;
  setPaused(policyId: string, userId: string, paused: boolean): Promise<Policy>;
}

export interface TaskRepository {
  create(task: AgentTask, policy: Policy, actions: TaskActionView[]): Promise<TaskDetails>;
  listByUser(userId: string): Promise<TaskDetails[]>;
  getById(taskId: string): Promise<TaskDetails | null>;
  updateAction(taskId: string, actionId: string, updater: (action: TaskActionView) => TaskActionView): Promise<TaskDetails>;
  updateTask(taskId: string, updater: (task: TaskDetails) => TaskDetails): Promise<TaskDetails>;
  getDailySpend(walletAddress: string, date: Date): Promise<string>;
  cancelPendingForUser(userId: string, reason: string): Promise<{ taskCount: number; actionCount: number }>;
}

export interface ApprovalRepository {
  record(record: ApprovalRecord & { decidedByUserId: string }): Promise<void>;
}

export interface ExecutionRepository {
  upsert(input: {
    actionId: string;
    txHash?: string | null;
    status: "PENDING" | "CONFIRMED" | "FAILED" | "TIMEOUT";
    broadcastAt?: string | null;
    confirmedAt?: string | null;
    error?: string | null;
    gasUsed?: string | null;
    valueWei?: string | null;
    explorerUrl?: string | null;
  }): Promise<void>;
}

export interface AuditRepository {
  append(event: AuditEvent): Promise<void>;
  listByUser(userId: string, query?: AuditQuery): Promise<AuditEvent[]>;
  getById(userId: string, eventId: string): Promise<AuditEvent | null>;
}

export interface TaskReplayExport {
  story: ReplayStory;
  markdown: string;
}
