import { useParams, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { ClarificationPrompt } from "@/components/task/ClarificationPrompt";
import { ActionList } from "@/components/task/ActionList";
import { useTask, useCancelTask } from "@/hooks/useTask";
import { useToast } from "@/store/uiStore";
import { getErrorMessage } from "@/api/client";
import { formatTimeAgo, taskStatusLabel } from "@/lib/utils";

function taskStatusVariant(status: string): "amber" | "success" | "danger" | "steel" | "default" {
  switch (status) {
    case "COMPLETED": return "success";
    case "FAILED": case "CANCELLED": return "danger";
    case "ACTIVE": case "NEEDS_CLARIFICATION": return "amber";
    case "PENDING": return "steel";
    default: return "default";
  }
}

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: task, isLoading } = useTask(id!);
  const cancelTask = useCancelTask();
  const toast = useToast();

  async function handleCancel() {
    try {
      await cancelTask.mutateAsync(id!);
      toast.success("Operation cancelled.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6 text-center text-text-tertiary font-sans text-sm">Operation not found.</div>
    );
  }

  const canCancel = task.status === "ACTIVE" || task.status === "NEEDS_CLARIFICATION" || task.status === "PENDING";

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader
        title="Operation"
        description={formatTimeAgo(task.createdAt)}
        back="/app/tasks"
        action={
          canCancel ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              loading={cancelTask.isPending}
            >
              <X size={12} /> Cancel
            </Button>
          ) : undefined
        }
      />

      {/* Goal */}
      <div className="bg-surface-1 border border-border-subtle rounded-card p-4 mb-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <p className="text-xs font-mono text-text-tertiary uppercase tracking-wider">Goal</p>
          <Badge variant={taskStatusVariant(task.status)} size="sm">
            {taskStatusLabel(task.status)}
          </Badge>
        </div>
        <p className="text-sm font-sans text-text-primary leading-relaxed">
          {task.naturalLanguageGoal}
        </p>

        {task.parsedIntent && (
          <div className="mt-3 pt-3 border-t border-border-subtle grid grid-cols-3 gap-3">
            {[
              { label: "Goal type", value: task.parsedIntent.goalType },
              { label: "Budget", value: task.parsedIntent.totalBudgetBnb ? `${task.parsedIntent.totalBudgetBnb} BNB` : "—" },
              { label: "Token", value: task.parsedIntent.targetTokenSymbol || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-surface-2 rounded p-2 border border-border-subtle">
                <p className="text-2xs text-text-tertiary font-mono mb-0.5">{label}</p>
                <p className="text-xs font-mono text-text-primary">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clarification */}
      {task.status === "NEEDS_CLARIFICATION" && (
        <div className="mb-4">
          <ClarificationPrompt
            task={task}
            onClarified={() => {}}
          />
        </div>
      )}

      {/* Actions */}
      {task.actions.length > 0 && (
        <div>
          <p className="text-xs font-mono text-text-tertiary uppercase tracking-wider mb-3">
            Actions ({task.actions.length})
          </p>
          <ActionList task={task} onTaskUpdated={() => {}} />
        </div>
      )}

      {task.status === "PENDING" && task.actions.length === 0 && (
        <div className="text-center py-8 text-text-tertiary font-sans text-sm">
          <Spinner className="mx-auto mb-3" />
          Deadhand is analyzing your goal...
        </div>
      )}

      {/* Replay link */}
      {(task.status === "COMPLETED" || task.status === "FAILED" || task.status === "CANCELLED") && (
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/app/replay?task=${task.id}`)}
          >
            View audit story →
          </Button>
        </div>
      )}
    </div>
  );
}
