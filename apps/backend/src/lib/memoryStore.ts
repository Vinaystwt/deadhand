import type { AgentTask, ApprovalRecord, AuditEvent, AuditQuery, Policy } from "@deadhand/types";
import type {
  ApprovalRepository,
  AuditRepository,
  AuthChallengeRepository,
  ExecutionRepository,
  PolicyRepository,
  Repositories,
  SessionRepository,
  TaskActionView,
  TaskDetails,
  TaskRepository,
  UserRepository
} from "../domain/types.js";

type User = { id: string; walletAddress: string };

class InMemoryAuthChallengeRepository implements AuthChallengeRepository {
  private readonly challenges = new Map<
    string,
    { nonce: string; message: string; createdAt: string; expiresAt: string }
  >();

  async create(
    walletAddress: string,
    challenge: { nonce: string; message: string; createdAt: string; expiresAt: string }
  ): Promise<void> {
    this.challenges.set(walletAddress.toLowerCase(), challenge);
  }

  async consume(walletAddress: string, nowIso: string): Promise<{ nonce: string; message: string } | null> {
    const key = walletAddress.toLowerCase();
    const challenge = this.challenges.get(key) ?? null;
    this.challenges.delete(key);
    if (!challenge) {
      return null;
    }

    if (new Date(challenge.expiresAt).getTime() < new Date(nowIso).getTime()) {
      return null;
    }

    return { nonce: challenge.nonce, message: challenge.message };
  }
}

class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async findOrCreate(walletAddress: string): Promise<User> {
    const key = walletAddress.toLowerCase();
    const existing = this.users.get(key);
    if (existing) {
      return existing;
    }

    const created = { id: crypto.randomUUID(), walletAddress };
    this.users.set(key, created);
    return created;
  }
}

class InMemorySessionRepository implements SessionRepository {
  private readonly sessions = new Map<string, { userId: string; jti: string; expiresAt: string; revokedAt?: string }>();

  async create(input: { userId: string; jti: string; expiresAt: string }): Promise<void> {
    this.sessions.set(input.jti, input);
  }

  async getActiveSession(jti: string): Promise<{ userId: string; jti: string; expiresAt: string } | null> {
    const session = this.sessions.get(jti);
    if (!session || session.revokedAt) {
      return null;
    }

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      return null;
    }

    return {
      userId: session.userId,
      jti: session.jti,
      expiresAt: session.expiresAt
    };
  }

  async revoke(jti: string): Promise<void> {
    const session = this.sessions.get(jti);
    if (!session) {
      return;
    }
    session.revokedAt = new Date().toISOString();
    this.sessions.set(jti, session);
  }
}

class InMemoryPolicyRepository implements PolicyRepository {
  private readonly policies = new Map<string, Policy>();

  async listByUser(userId: string): Promise<Policy[]> {
    return [...this.policies.values()].filter((policy) => policy.userId === userId);
  }

  async getById(policyId: string): Promise<Policy | null> {
    return this.policies.get(policyId) ?? null;
  }

  async create(policy: Policy): Promise<Policy> {
    this.policies.set(policy.id!, policy);
    return policy;
  }

  async update(policyId: string, policy: Policy): Promise<Policy> {
    this.policies.set(policyId, policy);
    return policy;
  }

  async archive(policyId: string, userId: string): Promise<Policy> {
    const policy = this.policies.get(policyId);
    if (!policy || policy.userId !== userId) {
      throw new Error("Policy not found");
    }
    policy.status = "ARCHIVED";
    policy.updatedAt = new Date().toISOString();
    this.policies.set(policyId, policy);
    return policy;
  }

  async delete(policyId: string, userId: string): Promise<void> {
    const policy = this.policies.get(policyId);
    if (!policy || policy.userId !== userId) {
      throw new Error("Policy not found");
    }
    this.policies.delete(policyId);
  }

  async pauseAll(userId: string, paused: boolean): Promise<number> {
    let count = 0;
    for (const policy of this.policies.values()) {
      if (policy.userId === userId) {
        policy.emergencyPaused = paused;
        policy.status = paused ? "PAUSED" : "ACTIVE";
        policy.updatedAt = new Date().toISOString();
        count += 1;
      }
    }
    return count;
  }

  async setPaused(policyId: string, userId: string, paused: boolean): Promise<Policy> {
    const policy = this.policies.get(policyId);
    if (!policy || policy.userId !== userId) {
      throw new Error("Policy not found");
    }

    policy.emergencyPaused = paused;
    policy.status = paused ? "PAUSED" : "ACTIVE";
    policy.updatedAt = new Date().toISOString();
    this.policies.set(policyId, policy);
    return policy;
  }
}

class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<string, TaskDetails>();

  async create(task: AgentTask, policy: Policy, actions: TaskActionView[]): Promise<TaskDetails> {
    const details: TaskDetails = {
      ...task,
      policy,
      actions
    };
    this.tasks.set(task.id!, details);
    return details;
  }

  async listByUser(userId: string): Promise<TaskDetails[]> {
    return [...this.tasks.values()].filter((task) => task.userId === userId);
  }

  async getById(taskId: string): Promise<TaskDetails | null> {
    return this.tasks.get(taskId) ?? null;
  }

  async updateAction(taskId: string, actionId: string, updater: (action: TaskActionView) => TaskActionView): Promise<TaskDetails> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    task.actions = task.actions.map((action) => (action.id === actionId ? updater(action) : action));
    task.updatedAt = new Date().toISOString();
    this.tasks.set(taskId, task);
    return task;
  }

  async updateTask(taskId: string, updater: (task: TaskDetails) => TaskDetails): Promise<TaskDetails> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    const updated = updater(task);
    this.tasks.set(taskId, updated);
    return updated;
  }

  async getDailySpend(_walletAddress: string, _date: Date): Promise<string> {
    return "0";
  }

  async cancelPendingForUser(userId: string, _reason: string): Promise<{ taskCount: number; actionCount: number }> {
    let taskCount = 0;
    let actionCount = 0;

    for (const [taskId, task] of this.tasks.entries()) {
      if (task.userId !== userId) {
        continue;
      }

      let touched = false;
      task.actions = task.actions.map((action) => {
        if (action.status === "EXECUTED" || action.status === "REJECTED" || action.status === "FAILED") {
          return action;
        }
        actionCount += 1;
        touched = true;
        return {
          ...action,
          status: "CANCELLED"
        };
      });

      if ((touched || task.actions.length === 0) && task.status !== "COMPLETED" && task.status !== "CANCELLED") {
        task.status = "CANCELLED";
        task.updatedAt = new Date().toISOString();
        taskCount += 1;
        this.tasks.set(taskId, task);
      }
    }

    return { taskCount, actionCount };
  }
}

class InMemoryApprovalRepository implements ApprovalRepository {
  private readonly approvals: (ApprovalRecord & { decidedByUserId: string })[] = [];

  async record(record: ApprovalRecord & { decidedByUserId: string }): Promise<void> {
    this.approvals.push(record);
  }
}

class InMemoryExecutionRepository implements ExecutionRepository {
  private readonly executions = new Map<
    string,
    {
      actionId: string;
      txHash?: string | null;
      status: "PENDING" | "CONFIRMED" | "FAILED" | "TIMEOUT";
      broadcastAt?: string | null;
      confirmedAt?: string | null;
      error?: string | null;
      gasUsed?: string | null;
      valueWei?: string | null;
      explorerUrl?: string | null;
    }
  >();

  async upsert(input: {
    actionId: string;
    txHash?: string | null;
    status: "PENDING" | "CONFIRMED" | "FAILED" | "TIMEOUT";
    broadcastAt?: string | null;
    confirmedAt?: string | null;
    error?: string | null;
    gasUsed?: string | null;
    valueWei?: string | null;
    explorerUrl?: string | null;
  }): Promise<void> {
    this.executions.set(input.actionId, input);
  }
}

class InMemoryAuditRepository implements AuditRepository {
  private readonly events: AuditEvent[] = [];

  async append(event: AuditEvent): Promise<void> {
    this.events.push({
      ...event,
      id: event.id ?? crypto.randomUUID(),
      timestamp: event.timestamp ?? new Date().toISOString()
    });
  }

  async listByUser(userId: string, query?: AuditQuery): Promise<AuditEvent[]> {
    return this.events
      .filter((event) => event.userId === userId)
      .filter((event) => !query?.taskId || event.taskId === query.taskId)
      .filter((event) => !query?.actionId || event.actionId === query.actionId)
      .filter((event) => !query?.eventType || event.eventType === query.eventType)
      .filter((event) => !query?.startDate || new Date(event.timestamp ?? 0).getTime() >= new Date(query.startDate).getTime())
      .filter((event) => !query?.endDate || new Date(event.timestamp ?? 0).getTime() <= new Date(query.endDate).getTime())
      .slice(0, query?.limit ?? 100);
  }

  async getById(userId: string, eventId: string): Promise<AuditEvent | null> {
    return this.events.find((event) => event.userId === userId && event.id === eventId) ?? null;
  }
}

export function createRepositories(): Repositories {
  return {
    authChallenges: new InMemoryAuthChallengeRepository(),
    sessions: new InMemorySessionRepository(),
    users: new InMemoryUserRepository(),
    policies: new InMemoryPolicyRepository(),
    tasks: new InMemoryTaskRepository(),
    approvals: new InMemoryApprovalRepository(),
    executions: new InMemoryExecutionRepository(),
    audit: new InMemoryAuditRepository()
  };
}
