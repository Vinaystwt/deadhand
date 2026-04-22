import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { TaskCard } from "@/components/task/TaskCard";
import { TaskSubmit } from "@/components/task/TaskSubmit";
import { useTasks } from "@/hooks/useTask";
import { usePolicies } from "@/hooks/usePolicy";
import type { Task } from "@/api/task";

export function TasksPage() {
  const { data: tasks, isLoading } = useTasks();
  const { data: policies } = usePolicies();
  const [showSubmit, setShowSubmit] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");
  const navigate = useNavigate();

  const activePolicies = policies?.filter((p) => p.status === "ACTIVE") ?? [];
  const hasPolicies = activePolicies.length > 0;

  function handleCreated(task: Task) {
    setShowSubmit(false);
    navigate(`/app/tasks/${task.id}`);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Operations"
        description="Submit goals and track Deadhand's enforcement decisions"
        action={
          <Button onClick={() => setShowSubmit(true)} size="sm" disabled={!hasPolicies}>
            <Plus size={13} /> New operation
          </Button>
        }
      />

      {!hasPolicies && (
        <div className="mb-6 bg-amber/8 border border-amber/20 rounded-card p-4">
          <p className="text-sm font-sans text-amber">
            Create a policy first before submitting operations.
          </p>
        </div>
      )}

      <AnimatePresence>
        {showSubmit && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-surface-1 border border-amber/30 rounded-card p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold font-display text-text-primary">Submit operation</p>
                <button
                  onClick={() => setShowSubmit(false)}
                  className="text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              {activePolicies.length > 0 && (
                <div className="mb-3">
                  <label className="text-xs font-mono text-text-tertiary block mb-1.5">Policy</label>
                  <select
                    value={selectedPolicyId || activePolicies[0]?.id || ""}
                    onChange={(e) => setSelectedPolicyId(e.target.value)}
                    className="w-full bg-surface-2 border border-border-subtle rounded px-3 py-2 text-sm font-sans text-text-primary focus:outline-none focus:border-amber/50"
                  >
                    {activePolicies.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <TaskSubmit
                policyId={selectedPolicyId || activePolicies[0]?.id || ""}
                onCreated={handleCreated}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : tasks?.length === 0 ? (
        <div className="text-center py-16 bg-surface-1 border border-border-subtle rounded-card">
          <p className="text-text-tertiary font-sans text-sm mb-2">No operations yet.</p>
          {hasPolicies && (
            <Button onClick={() => setShowSubmit(true)} size="sm">
              <Plus size={13} /> Submit your first operation
            </Button>
          )}
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-3"
        >
          {tasks?.map((task) => (
            <motion.div key={task.id} variants={staggerItem}>
              <TaskCard task={task} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
