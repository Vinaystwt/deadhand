import type { ReplayStory, ReplayStoryStep, ReasonCode } from "@deadhand/types";
import { replayStorySchema } from "@deadhand/types";
import type { Repositories, TaskReplayExport } from "../../domain/types.js";
import { extractReasonCodes, extractSeverity, extractStoryClass } from "../../domain/audit.js";
import { HttpError } from "../../lib/httpError.js";

export class StoryService {
  constructor(private readonly repositories: Repositories) {}

  async buildTaskStory(userId: string, taskId: string): Promise<ReplayStory> {
    const task = await this.repositories.tasks.getById(taskId);
    if (!task || task.userId !== userId) {
      throw new HttpError(404, "Task not found");
    }

    const events = await this.repositories.audit.listByUser(userId, {
      taskId,
      limit: 200
    });

    const steps: ReplayStoryStep[] = [
      {
        type: "GOAL",
        title: "Original goal",
        reasonCodes: [],
        summary: task.naturalLanguageGoal,
        payload: {
          goal: task.naturalLanguageGoal
        }
      }
    ];

    if (task.parsedIntent) {
      steps.push({
        type: "INTENT",
        title: "Parsed intent",
        reasonCodes: task.parsedIntent.clarificationNeeded ? ["TASK_NEEDS_CLARIFICATION"] : [],
        summary: task.parsedIntent.clarificationNeeded
          ? `Clarification requested: ${task.parsedIntent.clarificationQuestion}`
          : `Intent parsed as ${task.parsedIntent.goalType}`,
        payload: task.parsedIntent as Record<string, unknown>
      });
    }

    steps.push({
      type: "ACTION_PLAN",
      title: "Candidate actions",
      reasonCodes: [],
      summary: `${task.actions.length} candidate action(s) planned`,
      payload: {
        actions: task.actions.map((action) => ({
          id: action.id,
          label: action.label,
          decision: action.policyDecision,
          reasonCodes: action.decisionReceipt?.reasonCodes ?? [],
          safetyCard: action.safetyCard
        }))
      }
    });

    for (const action of task.actions) {
      if (action.policyDecision === "BLOCKED" && action.decisionReceipt) {
        steps.push({
          type: "DEADHAND_VETO",
          title: `Deadhand veto: ${action.label}`,
          reasonCodes: action.decisionReceipt.reasonCodes,
          summary: action.decisionReceipt.humanExplanation,
          payload: {
            receipt: action.decisionReceipt
          }
        });
      } else if (action.policyDecision === "REQUIRES_APPROVAL" && action.safetyCard) {
        steps.push({
          type: "APPROVAL_GATE",
          title: `Approval gate: ${action.label}`,
          reasonCodes: action.decisionReceipt?.reasonCodes ?? [],
          summary: action.safetyCard.riskSummary,
          payload: {
            safetyCard: action.safetyCard
          }
        });
      }

      steps.push({
        type: "SIMULATION",
        title: `Simulation: ${action.label}`,
        reasonCodes: action.simulation.success ? ["SIMULATION_PASSED"] : ["SIMULATION_FAILED"],
        summary: action.simulation.success
          ? `Preflight passed with gas estimate ${action.simulation.gasEstimate ?? "unknown"}`
          : `Preflight failed: ${action.simulation.error ?? "unknown error"}`,
        payload: {
          simulation: action.simulation
        }
      });

      if (action.driftReceipt) {
        steps.push({
          type: "EXECUTION_GUARD",
          title: `Drift lock: ${action.label}`,
          reasonCodes: [action.driftReceipt.reasonCode],
          summary: action.driftReceipt.humanExplanation,
          payload: {
            driftReceipt: action.driftReceipt
          }
        });
      }
    }

    for (const event of events.sort(
      (left, right) => new Date(left.timestamp ?? 0).getTime() - new Date(right.timestamp ?? 0).getTime()
    )) {
      const metadataReasonCodes = extractReasonCodes(event) as ReasonCode[];

      if (event.eventType === "EXECUTION_STARTED") {
        steps.push({
          type: "EXECUTION_GUARD",
          title: "Execution guard recheck passed",
          reasonCodes: metadataReasonCodes,
          summary: "Deadhand revalidated the execution envelope and passed the final execution guard.",
          payload: event.metadata
        });
      }

      if (event.eventType === "EXECUTION_CONFIRMED" || event.eventType === "EXECUTION_FAILED") {
        steps.push({
          type: "EXECUTION_RESULT",
          title: event.eventType === "EXECUTION_CONFIRMED" ? "Execution confirmed" : "Execution failed",
          reasonCodes: metadataReasonCodes,
          summary:
            event.eventType === "EXECUTION_CONFIRMED"
              ? "Guarded execution completed and was recorded."
              : "Guarded execution failed and was recorded.",
          payload: event.metadata
        });
      }

      if (event.eventType === "EMERGENCY_STOP_TRIGGERED" || event.eventType === "EMERGENCY_STOP_CLEARED") {
        steps.push({
          type: "EMERGENCY_STOP",
          title: event.eventType === "EMERGENCY_STOP_TRIGGERED" ? "Emergency kill switch" : "Emergency resume",
          reasonCodes: metadataReasonCodes,
          summary:
            event.eventType === "EMERGENCY_STOP_TRIGGERED"
              ? "Deadhand cancelled pending work and paused execution."
              : "Deadhand resumed execution readiness.",
          payload: event.metadata
        });
      }
    }

    return replayStorySchema.parse({
      taskId: task.id!,
      policyId: task.policyId,
      goal: task.naturalLanguageGoal,
      status: task.status,
      steps,
      generatedAt: new Date().toISOString()
    });
  }

  async exportTaskStory(userId: string, taskId: string): Promise<TaskReplayExport> {
    const story = await this.buildTaskStory(userId, taskId);
    const markdown = [
      `# Deadhand Replay Story`,
      ``,
      `- Task ID: \`${story.taskId}\``,
      `- Policy ID: \`${story.policyId}\``,
      `- Status: \`${story.status}\``,
      `- Generated At: ${story.generatedAt}`,
      ``,
      `## Goal`,
      story.goal,
      ``,
      `## Story Steps`,
      ...story.steps.flatMap((step, index) => [
        `### ${index + 1}. ${step.title}`,
        `- Type: \`${step.type}\``,
        `- Reason Codes: ${step.reasonCodes.length > 0 ? step.reasonCodes.map((code) => `\`${code}\``).join(", ") : "none"}`,
        `- Summary: ${step.summary}`,
        ...this.formatPayload(step.payload),
        ``
      ])
    ].join("\n");

    return {
      story,
      markdown
    };
  }

  private formatPayload(payload: Record<string, unknown>): string[] {
    const entries = Object.entries(payload);
    if (entries.length === 0) {
      return ["- Payload: none"];
    }

    return [
      `- Payload:`,
      "```json",
      JSON.stringify(payload, null, 2),
      "```"
    ];
  }
}
