import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, ShieldX, ShieldAlert, ShieldCheck } from "lucide-react";
import { cardReveal } from "@/lib/motion";
import { Badge } from "@/components/ui/Badge";
import { cn, formatTimeAgo, taskStatusLabel } from "@/lib/utils";
import type { Task } from "@/api/task";

interface TaskCardProps {
  task: Task;
}

function statusVariant(status: string): "amber" | "success" | "danger" | "steel" | "default" {
  switch (status) {
    case "PENDING": return "steel";
    case "NEEDS_CLARIFICATION": return "amber";
    case "ACTIVE": return "amber";
    case "COMPLETED": return "success";
    case "CANCELLED": return "default";
    case "FAILED": return "danger";
    default: return "default";
  }
}

export function TaskCard({ task }: TaskCardProps) {
  const blockedCount = task.actions.filter((a) => a.policyDecision === "BLOCKED").length;
  const approvalCount = task.actions.filter((a) => a.policyDecision === "REQUIRES_APPROVAL").length;
  const autoCount = task.actions.filter((a) => a.policyDecision === "AUTO_APPROVED").length;

  return (
    <motion.div variants={cardReveal} initial="initial" animate="animate">
      <Link
        to={`/app/tasks/${task.id}`}
        className="block bg-surface-1 border border-border-subtle rounded-card p-4 hover:border-border-medium transition-colors group"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant={statusVariant(task.status)} size="sm">
                {taskStatusLabel(task.status)}
              </Badge>
              {task.createdAt && (
                <span className="text-2xs text-text-tertiary font-mono">{formatTimeAgo(task.createdAt)}</span>
              )}
            </div>
            <p className="text-sm font-medium text-text-primary font-sans truncate group-hover:text-amber transition-colors">
              {task.naturalLanguageGoal}
            </p>
          </div>
          <ChevronRight size={14} className="text-text-tertiary group-hover:text-amber transition-colors mt-1 shrink-0" />
        </div>

        {task.actions.length > 0 && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border-subtle">
            {blockedCount > 0 && (
              <span className="flex items-center gap-1 text-2xs font-mono text-danger">
                <ShieldX size={11} /> {blockedCount} blocked
              </span>
            )}
            {approvalCount > 0 && (
              <span className="flex items-center gap-1 text-2xs font-mono text-amber">
                <ShieldAlert size={11} /> {approvalCount} need approval
              </span>
            )}
            {autoCount > 0 && (
              <span className="flex items-center gap-1 text-2xs font-mono text-success">
                <ShieldCheck size={11} /> {autoCount} auto-approved
              </span>
            )}
          </div>
        )}
      </Link>
    </motion.div>
  );
}
