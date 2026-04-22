import { useState } from "react";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { VetoCard } from "@/components/trust/VetoCard";
import { ApprovalGate } from "@/components/trust/ApprovalGate";
import { AutoApprovedCard } from "@/components/trust/AutoApprovedCard";
import { taskApi } from "@/api/task";
import { useToast } from "@/store/uiStore";
import { getErrorMessage } from "@/api/client";
import type { Task, Action } from "@/api/task";

interface ExecutionResults {
  [actionId: string]: { txHash?: string; explorerUrl?: string; error?: string };
}

interface ActionListProps {
  task: Task;
  onTaskUpdated: (task: Task) => void;
  disabled?: boolean;
}

export function ActionList({ task, onTaskUpdated, disabled }: ActionListProps) {
  const [executionResults, setExecutionResults] = useState<ExecutionResults>({});
  const toast = useToast();

  async function handleApprove(action: Action) {
    try {
      const updated = await taskApi.approveAction(task.id, action.id);
      onTaskUpdated(updated);
      toast.success("Action approved.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleReject(action: Action) {
    try {
      const updated = await taskApi.rejectAction(task.id, action.id);
      onTaskUpdated(updated);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleExecute(action: Action) {
    try {
      const result = await taskApi.executeAction(task.id, action.id, { useDemoWallet: true });
      onTaskUpdated(result.task);
      if (result.execution.success) {
        setExecutionResults((prev) => ({
          ...prev,
          [action.id]: {
            txHash: result.execution.txHash,
            explorerUrl: result.execution.explorerUrl,
          },
        }));
        toast.success("Execution confirmed.");
      } else {
        setExecutionResults((prev) => ({
          ...prev,
          [action.id]: { error: result.execution.error ?? "Execution failed." },
        }));
        toast.error(result.execution.error ?? "Execution failed.");
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      setExecutionResults((prev) => ({ ...prev, [action.id]: { error: msg } }));
      toast.error(msg);
    }
  }

  if (!task.actions || task.actions.length === 0) {
    return (
      <div className="text-center py-8 text-text-tertiary text-sm font-sans">
        No actions generated yet.
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-3"
    >
      {task.actions
        .sort((a, b) => a.order - b.order)
        .map((action) => (
          <motion.div key={action.id} variants={staggerItem}>
            {action.policyDecision === "BLOCKED" && (
              <VetoCard action={action} />
            )}
            {action.policyDecision === "REQUIRES_APPROVAL" && (
              <ApprovalGate
                action={action}
                onApprove={() => handleApprove(action)}
                onReject={() => handleReject(action)}
                onExecute={
                  action.status === "APPROVED" || action.status === "READY_TO_EXECUTE"
                    ? () => handleExecute(action)
                    : undefined
                }
                executionResult={executionResults[action.id]}
                disabled={disabled}
              />
            )}
            {action.policyDecision === "AUTO_APPROVED" && (
              <AutoApprovedCard
                action={action}
                onExecute={
                  action.status !== "EXECUTED" && action.status !== "FAILED"
                    ? () => handleExecute(action)
                    : undefined
                }
                executionResult={executionResults[action.id]}
                disabled={disabled}
              />
            )}
          </motion.div>
        ))}
    </motion.div>
  );
}
