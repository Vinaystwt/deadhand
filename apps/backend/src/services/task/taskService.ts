import type { AgentTask, ApprovalRecord, ClarifyTaskRequest, SimulationResult } from "@deadhand/types";
import { clarifyTaskRequestSchema, createTaskRequestSchema } from "@deadhand/types";
import { env } from "../../config/env.js";
import { getPlanningAvailableContracts } from "../../domain/integrations.js";
import {
  buildDecisionReceipt,
  buildExecutionEnvelope,
  buildSafetyCard,
  compareExecutionEnvelopes,
  buildDriftReceipt
} from "../../domain/deadhand.js";
import { evaluatePolicy } from "../../domain/policy.js";
import type { Repositories, TaskActionView, TaskDetails } from "../../domain/types.js";
import { HttpError } from "../../lib/httpError.js";
import { AIService } from "../ai/aiService.js";
import { AuditService } from "../audit/auditService.js";
import { ExecutionService } from "../execution/executionService.js";

export class TaskService {
  constructor(
    private readonly repositories: Repositories,
    private readonly aiService: AIService,
    private readonly executionService: ExecutionService,
    private readonly auditService: AuditService
  ) {}

  private async planTaskActions(policy: any, walletAddress: string, goal: string) {
    const intent = await this.aiService.parseIntent(goal, policy, walletAddress);
    if (intent.clarificationNeeded) {
      return {
        intent,
        actions: null
      };
    }

    await this.auditService.log({
      userId: policy.userId!,
      eventType: "INTENT_PARSED",
      metadata: { goal, goalType: intent.goalType }
    });

    const planned = await this.aiService.planActions({
      intent,
      policy,
      walletAddress,
      chainId: env.BNB_CHAIN_ID,
      availableContracts: getPlanningAvailableContracts()
    });

    const dailySpend = await this.repositories.tasks.getDailySpend(walletAddress, new Date());
    const actions = await Promise.all(
      planned.map(async (action): Promise<TaskActionView> => {
        const actionWithId = {
          ...action,
          id: crypto.randomUUID()
        };
        const evaluation = evaluatePolicy(policy, actionWithId, { spentTodayBnb: dailySpend });
        let simulation: SimulationResult = {
          success: false,
          status: "SKIPPED",
          error: "Simulation skipped because action was blocked.",
          gasEstimate: null,
          logs: []
        };
        let approvedExecutionEnvelope = null;

        if (evaluation.decision !== "BLOCKED") {
          try {
            const request = await this.executionService.prepareAction(actionWithId, walletAddress);
            approvedExecutionEnvelope = buildExecutionEnvelope(actionWithId, request);
            simulation = await this.executionService.simulatePrepared(request);
          } catch (error) {
            simulation = {
              success: false,
              status: "SKIPPED",
              error: error instanceof Error ? error.message : "Simulation skipped because execution target is unavailable.",
              gasEstimate: null,
              logs: ["execution_target_unavailable"]
            };
          }
        }

        const risk = await this.aiService.explainRisk({
          action: actionWithId,
          decision: evaluation.decision,
          simulationSuccess: simulation.success
        });

        const decisionReceipt =
          evaluation.receipt ?? buildDecisionReceipt(actionWithId, evaluation.decision, evaluation.triggeredRules);
        const safetyCard = buildSafetyCard({
          policy,
          action: actionWithId,
          decision: evaluation.decision,
          receipt: decisionReceipt,
          simulation
        });

        return {
          ...actionWithId,
          policyDecision: evaluation.decision,
          triggeredRules: evaluation.triggeredRules.map((rule) => rule.reasonCode),
          policyExplanation: evaluation.explanation,
          riskLevel: evaluation.decision === "BLOCKED" ? "BLOCKED" : risk.riskLevel,
          riskExplanation: risk.explanation,
          status: "PENDING",
          simulation,
          decisionReceipt,
          safetyCard,
          approvedExecutionEnvelope,
          driftReceipt: null
        };
      })
    );

    await this.auditService.log({
      userId: policy.userId!,
      eventType: "PLAN_GENERATED",
      metadata: { actionCount: actions.length }
    });

    for (const action of actions) {
      await this.auditService.log({
        userId: policy.userId!,
        eventType: action.policyDecision === "BLOCKED" ? "POLICY_EVALUATED_BLOCK" : "POLICY_EVALUATED_PASS",
        metadata: {
          plannedActionId: action.id,
          plannedActionOrder: action.order,
          plannedActionLabel: action.label,
          reasonCodes: action.decisionReceipt?.reasonCodes ?? [],
          severity: action.decisionReceipt?.severity ?? (action.policyDecision === "BLOCKED" ? "HIGH" : "INFO"),
          storyClass: action.policyDecision === "BLOCKED" ? "POLICY_VETO" : action.policyDecision === "REQUIRES_APPROVAL" ? "APPROVAL_GATE" : "ACTION_PLAN",
          decisionReceipt: action.decisionReceipt,
          safetyCard: action.safetyCard
        }
      });

      if (action.simulation.status === "PASSED") {
        await this.auditService.log({
          userId: policy.userId!,
          eventType: "SIMULATION_PASSED",
          metadata: {
            plannedActionId: action.id,
            plannedActionOrder: action.order,
            plannedActionLabel: action.label,
            reasonCode: "SIMULATION_PASSED",
            reasonCodes: ["SIMULATION_PASSED"],
            severity: "INFO",
            storyClass: "SIMULATION",
            simulation: action.simulation
          }
        });
      } else if (action.simulation.status === "FAILED") {
        await this.auditService.log({
          userId: policy.userId!,
          eventType: "SIMULATION_FAILED",
          metadata: {
            plannedActionId: action.id,
            plannedActionOrder: action.order,
            plannedActionLabel: action.label,
            reasonCode: "SIMULATION_FAILED",
            reasonCodes: ["SIMULATION_FAILED"],
            severity: "HIGH",
            storyClass: "SIMULATION",
            simulation: action.simulation
          }
        });
      }
    }

    return {
      intent,
      actions
    };
  }

  async createTask(userId: string, walletAddress: string, input: unknown): Promise<TaskDetails> {
    const parsed = createTaskRequestSchema.parse(input);
    const policy = await this.repositories.policies.getById(parsed.policyId);
    if (!policy) {
      throw new HttpError(404, "Policy not found");
    }

    if (policy.userId !== userId) {
      throw new HttpError(403, "Policy does not belong to current user");
    }

    const { intent, actions } = await this.planTaskActions(policy, walletAddress, parsed.goal);
    if (intent.clarificationNeeded) {
      const pendingTask: AgentTask = {
        id: crypto.randomUUID(),
        userId,
        policyId: policy.id!,
        policyVersion: policy.version,
        naturalLanguageGoal: parsed.goal,
        parsedIntent: intent,
        status: "NEEDS_CLARIFICATION",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const created = await this.repositories.tasks.create(pendingTask, policy, []);
      await this.auditService.log({
        userId,
        taskId: created.id,
        eventType: "TASK_CLARIFICATION_REQUESTED",
      metadata: {
        question: intent.clarificationQuestion,
        reasonCode: "TASK_NEEDS_CLARIFICATION",
        reasonCodes: ["TASK_NEEDS_CLARIFICATION"],
        severity: "WARNING",
        storyClass: "INTENT"
      }
    });
      return created;
    }

    const task: AgentTask = {
      id: crypto.randomUUID(),
      userId,
      policyId: policy.id!,
      policyVersion: policy.version,
      naturalLanguageGoal: parsed.goal,
      parsedIntent: intent,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const created = await this.repositories.tasks.create(task, policy, actions ?? []);

    await this.auditService.log({
      userId,
      taskId: created.id,
      eventType: "TASK_CREATED",
      metadata: { goal: parsed.goal }
    });

    return created;
  }

  async listTasks(userId: string): Promise<TaskDetails[]> {
    return this.repositories.tasks.listByUser(userId);
  }

  async getTask(userId: string, taskId: string): Promise<TaskDetails> {
    const task = await this.repositories.tasks.getById(taskId);
    if (!task || task.userId !== userId) {
      throw new HttpError(404, "Task not found");
    }

    return task;
  }

  async clarifyTask(
    userId: string,
    walletAddress: string,
    taskId: string,
    input: ClarifyTaskRequest | unknown
  ): Promise<TaskDetails> {
    const parsed = clarifyTaskRequestSchema.parse(input);
    const task = await this.getTask(userId, taskId);
    if (task.status !== "NEEDS_CLARIFICATION") {
      throw new HttpError(400, "Task does not require clarification");
    }

    const goal = `${task.naturalLanguageGoal}\nClarification: ${parsed.answer}`;
    const { intent, actions } = await this.planTaskActions(task.policy, walletAddress, goal);

    await this.auditService.log({
      userId,
      taskId,
      eventType: "TASK_CLARIFIED",
      metadata: { answer: parsed.answer }
    });

    if (intent.clarificationNeeded) {
      return this.repositories.tasks.updateTask(taskId, (current) => ({
        ...current,
        naturalLanguageGoal: goal,
        parsedIntent: intent,
        status: "NEEDS_CLARIFICATION",
        updatedAt: new Date().toISOString()
      }));
    }

    return this.repositories.tasks.updateTask(taskId, (current) => ({
      ...current,
      naturalLanguageGoal: goal,
      parsedIntent: intent,
      status: "ACTIVE",
      updatedAt: new Date().toISOString(),
      actions: actions ?? []
    }));
  }

  async approveAction(userId: string, taskId: string, actionId: string): Promise<TaskDetails> {
    const task = await this.getTask(userId, taskId);
    const action = task.actions.find((candidate) => candidate.id === actionId);
    if (!action) {
      throw new HttpError(404, "Action not found");
    }

    if (action.policyDecision === "BLOCKED") {
      throw new HttpError(400, "Blocked actions cannot be approved");
    }

    const updated = await this.repositories.tasks.updateAction(taskId, actionId, (current) => ({
      ...current,
      status: "APPROVED"
    }));

    const record: ApprovalRecord & { decidedByUserId: string } = {
      actionId,
      decision: "APPROVED",
      decidedByUserId: userId
    };
    await this.repositories.approvals.record(record);
    await this.auditService.log({
      userId,
      taskId,
      actionId,
      eventType: "ACTION_APPROVED",
      metadata: {
        reasonCode: "POLICY_REQUIRES_APPROVAL_THRESHOLD",
        reasonCodes: action.decisionReceipt?.reasonCodes ?? ["POLICY_REQUIRES_APPROVAL_THRESHOLD"],
        severity: action.decisionReceipt?.severity ?? "WARNING",
        storyClass: "APPROVAL_GATE"
      }
    });
    return updated;
  }

  async rejectAction(userId: string, taskId: string, actionId: string): Promise<TaskDetails> {
    const task = await this.getTask(userId, taskId);
    const action = task.actions.find((candidate) => candidate.id === actionId);
    const updated = await this.repositories.tasks.updateAction(taskId, actionId, (current) => ({
      ...current,
      status: "REJECTED"
    }));
    await this.repositories.approvals.record({
      actionId,
      decision: "REJECTED",
      decidedByUserId: userId
    });
    await this.auditService.log({
      userId,
      taskId,
      actionId,
      eventType: "ACTION_REJECTED",
      metadata: {
        reasonCodes: action?.decisionReceipt?.reasonCodes ?? [],
        severity: action?.decisionReceipt?.severity ?? "WARNING",
        storyClass: "APPROVAL_GATE"
      }
    });
    return updated;
  }

  async cancelPendingForUser(userId: string, reason: string) {
    return this.repositories.tasks.cancelPendingForUser(userId, reason);
  }

  async cancelTask(userId: string, taskId: string): Promise<TaskDetails> {
    await this.getTask(userId, taskId);
    const updated = await this.repositories.tasks.updateTask(taskId, (current) => ({
      ...current,
      status: "CANCELLED",
      updatedAt: new Date().toISOString(),
      actions: current.actions.map((action) =>
        action.status === "EXECUTED"
          ? action
          : {
              ...action,
              status: "CANCELLED"
            }
      )
    }));
    await this.auditService.log({
      userId,
      taskId,
      eventType: "TASK_CANCELLED",
      metadata: {}
    });
    return updated;
  }

  async executeAction(
    userId: string,
    walletAddress: string,
    taskId: string,
    actionId: string,
    input: { signedPayload?: string; useDemoWallet?: boolean }
  ) {
    const task = await this.getTask(userId, taskId);
    const action = task.actions.find((candidate) => candidate.id === actionId);
    if (!action) {
      throw new HttpError(404, "Action not found");
    }

    if (action.policyDecision === "BLOCKED") {
      throw new HttpError(400, "Blocked actions cannot execute");
    }

    if (action.policyDecision === "REQUIRES_APPROVAL" && action.status !== "APPROVED") {
      throw new HttpError(400, "Action must be approved before execution");
    }

    const request = await this.executionService.prepareAction(action, walletAddress);
    const actualEnvelope = buildExecutionEnvelope(action, request);
    if (action.approvedExecutionEnvelope) {
      const driftCheck = compareExecutionEnvelopes(action.approvedExecutionEnvelope, actualEnvelope);
      if (!driftCheck.matches) {
        const driftReceipt = buildDriftReceipt({
          expected: action.approvedExecutionEnvelope,
          actual: actualEnvelope,
          mismatchFields: driftCheck.mismatchFields
        });
        await this.repositories.tasks.updateAction(taskId, actionId, (current) => ({
          ...current,
          driftReceipt,
          status: "FAILED"
        }));
        await this.auditService.log({
          userId,
          taskId,
          actionId,
          eventType: "EXECUTION_FAILED",
          metadata: {
            reasonCode: driftReceipt.reasonCode,
            reasonCodes: [driftReceipt.reasonCode],
            severity: "CRITICAL",
            storyClass: "EXECUTION_GUARD",
            driftReceipt
          }
        });
        throw new HttpError(409, "Execution drift blocked by Deadhand", driftReceipt);
      }
    }

    const simulation = await this.executionService.simulatePrepared(request);
    if (!simulation.success) {
      await this.auditService.log({
        userId,
        taskId,
        actionId,
        eventType: "SIMULATION_FAILED",
        metadata: {
          reasonCode: "SIMULATION_FAILED",
          reasonCodes: ["SIMULATION_FAILED"],
          severity: "HIGH",
          storyClass: "SIMULATION",
          simulation
        }
      });
      throw new HttpError(400, "Execution guard simulation failed", simulation);
    }

    await this.repositories.executions.upsert({
      actionId,
      status: "PENDING",
      broadcastAt: new Date().toISOString(),
      valueWei: request.valueWei
    });
    if (!input.useDemoWallet && !input.signedPayload) {
      throw new HttpError(400, "signedPayload is required unless useDemoWallet is true");
    }

    const result = input.useDemoWallet
      ? await this.executionService.executeWithDemoWallet(request, walletAddress)
      : await this.executionService.broadcastSignedTransaction(input.signedPayload!);
    await this.auditService.log({
      userId,
      taskId,
      actionId,
      eventType: "EXECUTION_STARTED",
      metadata: {
        walletAddress,
        reasonCode: "EXECUTION_GUARD_PASSED",
        reasonCodes: ["EXECUTION_GUARD_PASSED", "SIMULATION_PASSED"],
        severity: "INFO",
        storyClass: "EXECUTION_GUARD",
        approvedExecutionEnvelope: action.approvedExecutionEnvelope,
        actualExecutionEnvelope: actualEnvelope,
        safetyCard: action.safetyCard
      }
    });
    await this.repositories.executions.upsert({
      actionId,
      txHash: result.txHash,
      status: result.success ? "CONFIRMED" : "FAILED",
      broadcastAt: new Date().toISOString(),
      confirmedAt: result.success ? new Date().toISOString() : null,
      error: result.error,
      gasUsed: result.gasUsed ?? null,
      valueWei: request.valueWei,
      explorerUrl: result.txHash ? `${env.BSC_SCAN_BASE_URL}/tx/${result.txHash}` : null
    });
    const explorerUrl = result.txHash ? `${env.BSC_SCAN_BASE_URL}/tx/${result.txHash}` : null;
    await this.auditService.log({
      userId,
      taskId,
      actionId,
      eventType: "EXECUTION_CONFIRMED",
      metadata: {
        ...result,
        explorerUrl,
        reasonCode: result.success ? "EXECUTION_CONFIRMED_GUARDED" : "EXECUTION_FAILED_GUARDED",
        reasonCodes: [result.success ? "EXECUTION_CONFIRMED_GUARDED" : "EXECUTION_FAILED_GUARDED"],
        severity: result.success ? "INFO" : "HIGH",
        storyClass: "EXECUTION_RESULT"
      }
    });

    const taskWithUpdatedAction = await this.repositories.tasks.updateAction(taskId, actionId, (current) => ({
      ...current,
      status: result.success ? "EXECUTED" : "FAILED",
      simulation,
      driftReceipt: current.driftReceipt ?? null
    }));

    const finalizedTask = await this.repositories.tasks.updateTask(taskId, (current) => {
      const hasFailedAction = current.actions.some((candidate) => candidate.status === "FAILED");
      const hasExecutedAction = current.actions.some((candidate) => candidate.status === "EXECUTED");
      const allActionsTerminal =
        current.actions.length > 0 &&
        current.actions.every((candidate) =>
          ["EXECUTED", "FAILED", "REJECTED", "CANCELLED"].includes(candidate.status)
        );

      return {
        ...current,
        status: hasFailedAction ? "FAILED" : hasExecutedAction && allActionsTerminal ? "COMPLETED" : current.status,
        updatedAt: new Date().toISOString()
      };
    });

    return {
      task: finalizedTask,
      execution: {
        ...result,
        explorerUrl,
        safetyCard: action.safetyCard,
        reasonCodes: [result.success ? "EXECUTION_CONFIRMED_GUARDED" : "EXECUTION_FAILED_GUARDED"]
      }
    };
  }
}
