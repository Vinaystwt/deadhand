import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Activity, Zap, ChevronRight } from "lucide-react";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { PageHeader } from "@/components/layout/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { usePolicies } from "@/hooks/usePolicy";
import { useTasks } from "@/hooks/useTask";
import { formatTimeAgo, taskStatusLabel } from "@/lib/utils";

export function Dashboard() {
  const { data: policies, isLoading: policiesLoading } = usePolicies();
  const { data: tasks, isLoading: tasksLoading } = useTasks();

  const activePolicies = policies?.filter((p) => p.status === "ACTIVE").length ?? 0;
  const recentTasks = tasks?.slice(0, 5) ?? [];
  const pendingApprovals = tasks?.flatMap((t) => t.actions).filter(
    (a) => a.policyDecision === "REQUIRES_APPROVAL" && a.status === "PENDING"
  ).length ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Dashboard"
        description="Overview of your Deadhand protection layer"
      />

      {/* Stat cards */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-3 gap-4 mb-8"
      >
        {[
          {
            label: "Active policies",
            value: policiesLoading ? "—" : activePolicies,
            icon: Shield,
            color: "text-amber",
            bg: "bg-amber/8 border-amber/20",
            link: "/app/policies",
          },
          {
            label: "Recent operations",
            value: tasksLoading ? "—" : (tasks?.length ?? 0),
            icon: Activity,
            color: "text-steel-bright",
            bg: "bg-steel/8 border-steel/20",
            link: "/app/tasks",
          },
          {
            label: "Pending approvals",
            value: tasksLoading ? "—" : pendingApprovals,
            icon: Zap,
            color: pendingApprovals > 0 ? "text-amber" : "text-text-tertiary",
            bg: pendingApprovals > 0 ? "bg-amber/8 border-amber/20" : "bg-surface-2 border-border-subtle",
            link: "/app/tasks",
          },
        ].map(({ label, value, icon: Icon, color, bg, link }) => (
          <motion.div key={label} variants={staggerItem}>
            <Link
              to={link}
              className={`block border rounded-card p-4 hover:border-border-medium transition-colors ${bg}`}
            >
              <div className={`${color} mb-2`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-bold font-display text-text-primary">{value}</p>
              <p className="text-xs font-sans text-text-secondary mt-0.5">{label}</p>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent operations */}
      <div className="bg-surface-1 border border-border-subtle rounded-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <p className="text-xs font-mono text-text-tertiary uppercase tracking-wider">Recent operations</p>
          <Link
            to="/app/tasks"
            className="flex items-center gap-1 text-2xs font-mono text-text-tertiary hover:text-amber transition-colors"
          >
            View all <ChevronRight size={11} />
          </Link>
        </div>

        {tasksLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : recentTasks.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-text-tertiary font-sans">No operations yet.</p>
            <Link
              to="/app/tasks"
              className="text-xs text-amber hover:text-amber/80 font-mono mt-1 inline-block"
            >
              Submit your first task →
            </Link>
          </div>
        ) : (
          <div>
            {recentTasks.map((task) => {
              const blockedCount = task.actions.filter((a) => a.policyDecision === "BLOCKED").length;
              const approvalCount = task.actions.filter((a) => a.policyDecision === "REQUIRES_APPROVAL").length;

              return (
                <Link
                  key={task.id}
                  to={`/app/tasks/${task.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2/50 border-b border-border-subtle last:border-b-0 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-sans text-text-primary truncate group-hover:text-amber transition-colors">
                      {task.naturalLanguageGoal}
                    </p>
                    <p className="text-2xs font-mono text-text-tertiary mt-0.5">
                      {formatTimeAgo(task.createdAt)}
                      {blockedCount > 0 && <span className="text-danger ml-2">· {blockedCount} blocked</span>}
                      {approvalCount > 0 && <span className="text-amber ml-2">· {approvalCount} need approval</span>}
                    </p>
                  </div>
                  <Badge
                    variant={
                      task.status === "COMPLETED" ? "success" :
                      task.status === "FAILED" ? "danger" :
                      task.status === "ACTIVE" || task.status === "NEEDS_CLARIFICATION" ? "amber" :
                      "default"
                    }
                    size="sm"
                  >
                    {taskStatusLabel(task.status)}
                  </Badge>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
