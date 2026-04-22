import type {
  AuditEvent,
  AuditQuery,
  DecisionReceipt,
  DriftReceipt,
  ExecutionEnvelope,
  Policy,
  SafetyCard,
  SimulationResult
} from "@deadhand/types";
import { Prisma, type PrismaClient } from "@prisma/client";
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

type DeadhandActionMetadata = {
  decisionReceipt?: DecisionReceipt | null;
  safetyCard?: SafetyCard | null;
  approvedExecutionEnvelope?: ExecutionEnvelope | null;
  driftReceipt?: DriftReceipt | null;
};

function decimalToString(value: Prisma.Decimal | null | undefined): string | null {
  return value ? value.toString() : null;
}

function normalizeJsonArray<T>(value: Prisma.JsonValue | null | undefined): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function toInputJson(value: Record<string, unknown> | string[] | null | undefined) {
  if (value == null) {
    return Prisma.JsonNull;
  }
  return value as Prisma.InputJsonValue;
}

function toSimulationResult(action: {
  simulationResult: {
    success: boolean;
    error: string | null;
    gasEstimate: string | null;
    logs: Prisma.JsonValue;
  } | null;
  simulationStatus: string;
}): SimulationResult {
  return {
    success: action.simulationResult?.success ?? action.simulationStatus === "PASSED",
    status: action.simulationStatus as SimulationResult["status"],
    error: action.simulationResult?.error ?? null,
    gasEstimate: action.simulationResult?.gasEstimate ?? null,
    logs: normalizeJsonArray<string>(action.simulationResult?.logs)
  };
}

function splitActionMetadata(value: Prisma.JsonValue | null | undefined) {
  const metadata = (value ?? {}) as Record<string, unknown>;
  const deadhand = ((metadata.__deadhand as Record<string, unknown> | undefined) ?? {}) as DeadhandActionMetadata;
  const { __deadhand: _deadhand, ...publicMetadata } = metadata;
  return {
    publicMetadata,
    deadhand
  };
}

function serializeActionMetadata(action: TaskActionView) {
  return {
    ...action.metadata,
    __deadhand: {
      decisionReceipt: action.decisionReceipt ?? null,
      safetyCard: action.safetyCard ?? null,
      approvedExecutionEnvelope: action.approvedExecutionEnvelope ?? null,
      driftReceipt: action.driftReceipt ?? null
    }
  };
}

function toTaskActionView(action: any): TaskActionView {
  const { publicMetadata, deadhand } = splitActionMetadata(action.metadata);
  return {
    id: action.id,
    order: action.order,
    actionType: action.actionType,
    adapter: action.adapter,
    targetContractAddress: action.targetContract,
    targetTokenAddress: action.targetToken,
    destinationAddress: action.destinationAddress,
    amountBnb: decimalToString(action.amountBnb),
    amountTokenUnits: action.amountTokenUnits,
    slippageBps: action.slippageBps,
    estimatedCostBnb: action.estimatedCostBnb.toString(),
    label: action.label,
    calldata: action.calldata,
    metadata: publicMetadata,
    policyDecision: action.policyDecision,
    triggeredRules: normalizeJsonArray<string>(action.triggeredRules),
    policyExplanation: normalizeJsonArray<string>(action.policyExplanation),
    riskLevel: action.riskLevel,
    riskExplanation: action.riskExplanation,
    status: action.status as TaskActionView["status"],
    simulation: toSimulationResult(action),
    decisionReceipt: deadhand.decisionReceipt ?? null,
    safetyCard: deadhand.safetyCard ?? null,
    approvedExecutionEnvelope: deadhand.approvedExecutionEnvelope ?? null,
    driftReceipt: deadhand.driftReceipt ?? null
  };
}

function toPolicy(policy: any): Policy {
  return {
    id: policy.id,
    userId: policy.userId,
    walletAddress: policy.walletAddress,
    name: policy.name,
    description: policy.description,
    version: policy.version,
    status: policy.status,
    emergencyPaused: policy.emergencyPaused,
    approvalThresholdBnb: policy.approvalThresholdBnb.toString(),
    maxTransactionBnb: policy.maxTransactionBnb.toString(),
    maxDailySpendBnb: policy.maxDailySpendBnb.toString(),
    maxSlippageBps: policy.maxSlippageBps,
    allowedTokenAddresses: normalizeJsonArray<string>(policy.allowedTokenAddresses),
    blockedTokenAddresses: normalizeJsonArray<string>(policy.blockedTokenAddresses),
    allowedContractAddresses: normalizeJsonArray<string>(policy.allowedContractAddresses),
    blockedContractAddresses: normalizeJsonArray<string>(policy.blockedContractAddresses),
    allowedActionTypes: normalizeJsonArray<any>(policy.allowedActionTypes),
    blockedActionTypes: normalizeJsonArray<any>(policy.blockedActionTypes),
    simulationRequired: policy.simulationRequired,
    createdAt: policy.createdAt.toISOString(),
    updatedAt: policy.updatedAt.toISOString()
  };
}

function toTaskDetails(task: any): TaskDetails {
  return {
    id: task.id,
    userId: task.userId,
    policyId: task.policyId,
    policyVersion: task.policyVersion,
    naturalLanguageGoal: task.naturalLanguageGoal,
    parsedIntent: task.parsedIntent ?? undefined,
    status: task.status,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    policy: toPolicy(task.policy),
    actions: [...(task.actions ?? [])]
      .sort((left, right) => left.order - right.order)
      .map(toTaskActionView)
  };
}

class PrismaAuthChallengeRepository implements AuthChallengeRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async create(
    walletAddress: string,
    challenge: { nonce: string; message: string; createdAt: string; expiresAt: string }
  ): Promise<void> {
    await this.prismaClient.authChallenge.create({
      data: {
        walletAddress,
        nonce: challenge.nonce,
        message: challenge.message,
        createdAt: new Date(challenge.createdAt),
        expiresAt: new Date(challenge.expiresAt)
      }
    });
  }

  async consume(walletAddress: string, nowIso: string): Promise<{ nonce: string; message: string } | null> {
    const challenge = await this.prismaClient.authChallenge.findFirst({
      where: {
        walletAddress,
        expiresAt: {
          gte: new Date(nowIso)
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!challenge) {
      return null;
    }

    await this.prismaClient.authChallenge.delete({
      where: { id: challenge.id }
    });

    return {
      nonce: challenge.nonce,
      message: challenge.message
    };
  }
}

class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async create(input: { userId: string; jti: string; expiresAt: string }): Promise<void> {
    await this.prismaClient.session.create({
      data: {
        userId: input.userId,
        jti: input.jti,
        expiresAt: new Date(input.expiresAt)
      }
    });
  }

  async getActiveSession(jti: string): Promise<{ userId: string; jti: string; expiresAt: string } | null> {
    const session = await this.prismaClient.session.findUnique({
      where: { jti }
    });

    if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
      return null;
    }

    return {
      userId: session.userId,
      jti: session.jti,
      expiresAt: session.expiresAt.toISOString()
    };
  }

  async revoke(jti: string): Promise<void> {
    await this.prismaClient.session.updateMany({
      where: { jti },
      data: {
        revokedAt: new Date()
      }
    });
  }
}

class PrismaUserRepository implements UserRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async findOrCreate(walletAddress: string): Promise<{ id: string; walletAddress: string }> {
    const user = await this.prismaClient.user.upsert({
      where: { walletAddress },
      update: {},
      create: { walletAddress }
    });

    return {
      id: user.id,
      walletAddress: user.walletAddress
    };
  }
}

class PrismaPolicyRepository implements PolicyRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async listByUser(userId: string): Promise<Policy[]> {
    const policies = await this.prismaClient.policy.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" }
    });
    return policies.map(toPolicy);
  }

  async getById(policyId: string): Promise<Policy | null> {
    const policy = await this.prismaClient.policy.findUnique({ where: { id: policyId } });
    return policy ? toPolicy(policy) : null;
  }

  async create(policy: Policy): Promise<Policy> {
    const created = await this.prismaClient.policy.create({
      data: {
        id: policy.id,
        userId: policy.userId!,
        walletAddress: policy.walletAddress,
        name: policy.name,
        description: policy.description ?? null,
        version: policy.version,
        status: policy.status,
        emergencyPaused: policy.emergencyPaused,
        approvalThresholdBnb: new Prisma.Decimal(policy.approvalThresholdBnb),
        maxTransactionBnb: new Prisma.Decimal(policy.maxTransactionBnb),
        maxDailySpendBnb: new Prisma.Decimal(policy.maxDailySpendBnb),
        maxSlippageBps: policy.maxSlippageBps,
        allowedTokenAddresses: policy.allowedTokenAddresses,
        blockedTokenAddresses: policy.blockedTokenAddresses,
        allowedContractAddresses: policy.allowedContractAddresses,
        blockedContractAddresses: policy.blockedContractAddresses,
        allowedActionTypes: policy.allowedActionTypes,
        blockedActionTypes: policy.blockedActionTypes,
        simulationRequired: policy.simulationRequired
      }
    });
    return toPolicy(created);
  }

  async update(policyId: string, policy: Policy): Promise<Policy> {
    const updated = await this.prismaClient.policy.update({
      where: { id: policyId },
      data: {
        walletAddress: policy.walletAddress,
        name: policy.name,
        description: policy.description ?? null,
        version: policy.version,
        status: policy.status,
        emergencyPaused: policy.emergencyPaused,
        approvalThresholdBnb: new Prisma.Decimal(policy.approvalThresholdBnb),
        maxTransactionBnb: new Prisma.Decimal(policy.maxTransactionBnb),
        maxDailySpendBnb: new Prisma.Decimal(policy.maxDailySpendBnb),
        maxSlippageBps: policy.maxSlippageBps,
        allowedTokenAddresses: policy.allowedTokenAddresses,
        blockedTokenAddresses: policy.blockedTokenAddresses,
        allowedContractAddresses: policy.allowedContractAddresses,
        blockedContractAddresses: policy.blockedContractAddresses,
        allowedActionTypes: policy.allowedActionTypes,
        blockedActionTypes: policy.blockedActionTypes,
        simulationRequired: policy.simulationRequired
      }
    });
    return toPolicy(updated);
  }

  async archive(policyId: string, userId: string): Promise<Policy> {
    const existing = await this.prismaClient.policy.findFirst({
      where: { id: policyId, userId }
    });
    if (!existing) {
      throw new Error("Policy not found");
    }
    const archived = await this.prismaClient.policy.update({
      where: { id: policyId },
      data: {
        status: "ARCHIVED"
      }
    });
    return toPolicy(archived);
  }

  async delete(policyId: string, userId: string): Promise<void> {
    await this.prismaClient.policy.deleteMany({
      where: { id: policyId, userId }
    });
  }

  async pauseAll(userId: string, paused: boolean): Promise<number> {
    const result = await this.prismaClient.policy.updateMany({
      where: { userId },
      data: {
        emergencyPaused: paused,
        status: paused ? "PAUSED" : "ACTIVE"
      }
    });
    return result.count;
  }

  async setPaused(policyId: string, userId: string, paused: boolean): Promise<Policy> {
    const existing = await this.prismaClient.policy.findFirst({
      where: { id: policyId, userId }
    });
    if (!existing) {
      throw new Error("Policy not found");
    }
    const updated = await this.prismaClient.policy.update({
      where: { id: policyId },
      data: {
        emergencyPaused: paused,
        status: paused ? "PAUSED" : "ACTIVE"
      }
    });
    return toPolicy(updated);
  }
}

class PrismaTaskRepository implements TaskRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  private actionCreateInput(action: TaskActionView) {
    return {
      id: action.id,
      order: action.order,
      actionType: action.actionType,
      adapter: action.adapter,
      targetContract: action.targetContractAddress,
      targetToken: action.targetTokenAddress,
      destinationAddress: action.destinationAddress,
      amountBnb: action.amountBnb ? new Prisma.Decimal(action.amountBnb) : null,
      amountTokenUnits: action.amountTokenUnits,
      slippageBps: action.slippageBps,
      estimatedCostBnb: new Prisma.Decimal(action.estimatedCostBnb),
      label: action.label,
      calldata: action.calldata,
      metadata: toInputJson(serializeActionMetadata(action)),
      policyDecision: action.policyDecision,
      triggeredRules: action.triggeredRules,
      policyExplanation: action.policyExplanation,
      riskLevel: action.riskLevel,
      riskExplanation: action.riskExplanation,
      simulationStatus: action.simulation.status,
      status: action.status,
      simulationResult:
        action.simulation.status === "SKIPPED"
          ? undefined
          : {
              create: {
                success: action.simulation.success,
                error: action.simulation.error,
                gasEstimate: action.simulation.gasEstimate,
                logs: toInputJson(action.simulation.logs)
              }
            }
    };
  }

  private async fetchTask(taskId: string): Promise<TaskDetails | null> {
    const task = await this.prismaClient.agentTask.findUnique({
      where: { id: taskId },
      include: {
        policy: true,
        actions: {
          include: {
            simulationResult: true
          }
        }
      }
    });

    return task ? toTaskDetails(task) : null;
  }

  async create(task: any, policy: Policy, actions: TaskActionView[]): Promise<TaskDetails> {
    await this.prismaClient.agentTask.create({
      data: {
        id: task.id,
        userId: task.userId,
        policyId: task.policyId,
        policyVersion: task.policyVersion,
        naturalLanguageGoal: task.naturalLanguageGoal,
        parsedIntent: task.parsedIntent ?? Prisma.JsonNull,
        status: task.status,
        actions: {
          create: actions.map((action) => this.actionCreateInput(action))
        }
      }
    });

    const stored = await this.fetchTask(task.id);
    if (!stored) {
      throw new Error("Failed to create task");
    }
    return stored;
  }

  async listByUser(userId: string): Promise<TaskDetails[]> {
    const tasks = await this.prismaClient.agentTask.findMany({
      where: { userId },
      include: {
        policy: true,
        actions: {
          include: { simulationResult: true }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    return tasks.map(toTaskDetails);
  }

  async getById(taskId: string): Promise<TaskDetails | null> {
    return this.fetchTask(taskId);
  }

  async updateAction(taskId: string, actionId: string, updater: (action: TaskActionView) => TaskActionView): Promise<TaskDetails> {
    const current = await this.fetchTask(taskId);
    if (!current) {
      throw new Error("Task not found");
    }
    const action = current.actions.find((candidate) => candidate.id === actionId);
    if (!action) {
      throw new Error("Action not found");
    }
    const updatedAction = updater(action);

    await this.prismaClient.proposedAction.update({
      where: { id: actionId },
      data: {
        status: updatedAction.status,
        riskLevel: updatedAction.riskLevel,
        riskExplanation: updatedAction.riskExplanation,
        metadata: toInputJson(serializeActionMetadata(updatedAction)),
        simulationStatus: updatedAction.simulation.status,
        simulationResult: {
          upsert: {
            update: {
              success: updatedAction.simulation.success,
              error: updatedAction.simulation.error,
              gasEstimate: updatedAction.simulation.gasEstimate,
              logs: toInputJson(updatedAction.simulation.logs)
            },
            create: {
              success: updatedAction.simulation.success,
              error: updatedAction.simulation.error,
              gasEstimate: updatedAction.simulation.gasEstimate,
              logs: toInputJson(updatedAction.simulation.logs)
            }
          }
        }
      }
    });

    await this.prismaClient.agentTask.update({
      where: { id: taskId },
      data: { updatedAt: new Date() }
    });

    const stored = await this.fetchTask(taskId);
    if (!stored) {
      throw new Error("Task not found after action update");
    }
    return stored;
  }

  async updateTask(taskId: string, updater: (task: TaskDetails) => TaskDetails): Promise<TaskDetails> {
    const current = await this.fetchTask(taskId);
    if (!current) {
      throw new Error("Task not found");
    }
    const updated = updater(current);

    await this.prismaClient.agentTask.update({
      where: { id: taskId },
      data: {
        naturalLanguageGoal: updated.naturalLanguageGoal,
        parsedIntent: updated.parsedIntent ?? Prisma.JsonNull,
        status: updated.status,
        updatedAt: new Date(updated.updatedAt ?? Date.now())
      }
    });

    const requiresRecreate =
      updated.actions.length !== current.actions.length ||
      updated.actions.some((action, index) => current.actions[index]?.id !== action.id);

    if (requiresRecreate) {
      await this.prismaClient.proposedAction.deleteMany({
        where: { taskId }
      });

      if (updated.actions.length > 0) {
        await this.prismaClient.agentTask.update({
          where: { id: taskId },
          data: {
            actions: {
              create: updated.actions.map((action) => this.actionCreateInput(action))
            }
          }
        });
      }
    } else {
      for (const action of updated.actions) {
        await this.prismaClient.proposedAction.update({
          where: { id: action.id },
          data: {
            status: action.status,
            riskLevel: action.riskLevel,
            riskExplanation: action.riskExplanation,
            metadata: toInputJson(serializeActionMetadata(action)),
            policyDecision: action.policyDecision,
            triggeredRules: action.triggeredRules,
            policyExplanation: action.policyExplanation,
            simulationStatus: action.simulation.status,
            simulationResult:
              action.simulation.status === "SKIPPED"
                ? undefined
                : {
                    upsert: {
                      update: {
                        success: action.simulation.success,
                        error: action.simulation.error,
                        gasEstimate: action.simulation.gasEstimate,
                        logs: toInputJson(action.simulation.logs)
                      },
                      create: {
                        success: action.simulation.success,
                        error: action.simulation.error,
                        gasEstimate: action.simulation.gasEstimate,
                        logs: toInputJson(action.simulation.logs)
                      }
                    }
                  }
          }
        });
      }
    }

    const stored = await this.fetchTask(taskId);
    if (!stored) {
      throw new Error("Task not found after update");
    }
    return stored;
  }

  async getDailySpend(walletAddress: string, date: Date): Promise<string> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const records = await this.prismaClient.proposedAction.findMany({
      where: {
        task: {
          policy: {
            walletAddress
          }
        },
        executionRecord: {
          status: "CONFIRMED",
          confirmedAt: {
            gte: start,
            lt: end
          }
        }
      },
      select: {
        estimatedCostBnb: true
      }
    });

    const total = records.reduce(
      (sum, record) => sum.plus(record.estimatedCostBnb),
      new Prisma.Decimal(0)
    );

    return total.toString();
  }

  async cancelPendingForUser(userId: string, _reason: string): Promise<{ taskCount: number; actionCount: number }> {
    const tasks = await this.prismaClient.agentTask.findMany({
      where: {
        userId,
        status: {
          in: ["PENDING", "NEEDS_CLARIFICATION", "ACTIVE"]
        }
      },
      include: {
        actions: true
      }
    });

    let taskCount = 0;
    let actionCount = 0;

    for (const task of tasks) {
      const cancelableActions = task.actions.filter(
        (action) => !["EXECUTED", "REJECTED", "FAILED", "CANCELLED"].includes(action.status)
      );

      if (cancelableActions.length === 0 && task.actions.length > 0) {
        continue;
      }

      await this.prismaClient.proposedAction.updateMany({
        where: {
          taskId: task.id,
          status: {
            notIn: ["EXECUTED", "REJECTED", "FAILED", "CANCELLED"]
          }
        },
        data: {
          status: "CANCELLED"
        }
      });

      await this.prismaClient.agentTask.update({
        where: { id: task.id },
        data: {
          status: "CANCELLED",
          updatedAt: new Date()
        }
      });

      taskCount += 1;
      actionCount += cancelableActions.length;
    }

    return { taskCount, actionCount };
  }
}

class PrismaApprovalRepository implements ApprovalRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async record(record: { actionId: string; decision: "APPROVED" | "REJECTED"; decidedByUserId: string; notes?: string | null }): Promise<void> {
    await this.prismaClient.approvalRecord.create({
      data: {
        actionId: record.actionId,
        decision: record.decision,
        decidedByUserId: record.decidedByUserId,
        notes: record.notes ?? null
      }
    });
  }
}

class PrismaExecutionRepository implements ExecutionRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

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
    await this.prismaClient.executionRecord.upsert({
      where: { actionId: input.actionId },
      update: {
        txHash: input.txHash ?? null,
        status: input.status,
        broadcastAt: input.broadcastAt ? new Date(input.broadcastAt) : undefined,
        confirmedAt: input.confirmedAt ? new Date(input.confirmedAt) : undefined,
        error: input.error ?? null,
        gasUsed: input.gasUsed ?? null,
        valueWei: input.valueWei ?? null,
        explorerUrl: input.explorerUrl ?? null
      },
      create: {
        actionId: input.actionId,
        txHash: input.txHash ?? null,
        status: input.status,
        broadcastAt: input.broadcastAt ? new Date(input.broadcastAt) : null,
        confirmedAt: input.confirmedAt ? new Date(input.confirmedAt) : null,
        error: input.error ?? null,
        gasUsed: input.gasUsed ?? null,
        valueWei: input.valueWei ?? null,
        explorerUrl: input.explorerUrl ?? null
      }
    });
  }
}

class PrismaAuditRepository implements AuditRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async append(event: AuditEvent): Promise<void> {
    await this.prismaClient.auditEvent.create({
      data: {
        id: event.id,
        userId: event.userId,
        taskId: event.taskId ?? null,
        actionId: event.actionId ?? null,
        eventType: event.eventType,
        metadata: toInputJson(event.metadata),
        timestamp: event.timestamp ? new Date(event.timestamp) : new Date()
      }
    });
  }

  async listByUser(userId: string, query?: AuditQuery): Promise<AuditEvent[]> {
    const events = await this.prismaClient.auditEvent.findMany({
      where: {
        userId,
        taskId: query?.taskId,
        actionId: query?.actionId,
        eventType: query?.eventType,
        timestamp: {
          gte: query?.startDate ? new Date(query.startDate) : undefined,
          lte: query?.endDate ? new Date(query.endDate) : undefined
        }
      },
      orderBy: {
        timestamp: "desc"
      },
      take: query?.limit ?? 100
    });

    return events.map((event) => ({
      id: event.id,
      userId: event.userId,
      taskId: event.taskId,
      actionId: event.actionId,
      eventType: event.eventType as AuditEvent["eventType"],
      metadata: (event.metadata ?? {}) as Record<string, unknown>,
      timestamp: event.timestamp.toISOString()
    }));
  }

  async getById(userId: string, eventId: string): Promise<AuditEvent | null> {
    const event = await this.prismaClient.auditEvent.findFirst({
      where: {
        id: eventId,
        userId
      }
    });

    return event
      ? {
          id: event.id,
          userId: event.userId,
          taskId: event.taskId,
          actionId: event.actionId,
          eventType: event.eventType as AuditEvent["eventType"],
          metadata: (event.metadata ?? {}) as Record<string, unknown>,
          timestamp: event.timestamp.toISOString()
        }
      : null;
  }
}

export function createPrismaRepositories(prismaClient: PrismaClient): Repositories {
  return {
    authChallenges: new PrismaAuthChallengeRepository(prismaClient),
    sessions: new PrismaSessionRepository(prismaClient),
    users: new PrismaUserRepository(prismaClient),
    policies: new PrismaPolicyRepository(prismaClient),
    tasks: new PrismaTaskRepository(prismaClient),
    approvals: new PrismaApprovalRepository(prismaClient),
    executions: new PrismaExecutionRepository(prismaClient),
    audit: new PrismaAuditRepository(prismaClient)
  };
}
