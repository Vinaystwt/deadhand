import { useState } from "react";
import { Send, Target } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { taskApi } from "@/api/task";
import { useToast } from "@/store/uiStore";
import { getErrorMessage } from "@/api/client";
import type { Task } from "@/api/task";

interface TaskSubmitProps {
  policyId: string;
  onCreated: (task: Task) => void;
}

const exampleGoals = [
  "Help me set up launch liquidity using about 2 BNB total",
  "Buy the token with 0.1 BNB after launch",
  "Transfer 0.05 BNB to my secondary wallet",
];

export function TaskSubmit({ policyId, onCreated }: TaskSubmitProps) {
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function handleSubmit() {
    if (!goal.trim()) return;
    setLoading(true);
    try {
      const task = await taskApi.create(policyId, goal.trim());
      onCreated(task);
      setGoal("");
      toast.success("Task created.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Target size={14} className="text-amber" />
        <p className="text-sm font-semibold font-display text-text-primary">New operation</p>
      </div>

      <Textarea
        placeholder="Describe your goal in plain language..."
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        rows={3}
        hint="AI will interpret your goal and propose actions. Deadhand will evaluate each one."
      />

      {/* Example goals */}
      <div className="flex flex-wrap gap-1.5">
        {exampleGoals.map((eg) => (
          <button
            key={eg}
            onClick={() => setGoal(eg)}
            className="text-2xs font-sans text-text-tertiary bg-surface-2 border border-border-subtle px-2 py-1 rounded hover:text-text-secondary hover:border-border-medium transition-colors"
          >
            {eg.slice(0, 40)}...
          </button>
        ))}
      </div>

      <Button
        variant="primary"
        size="sm"
        onClick={handleSubmit}
        loading={loading}
        disabled={!goal.trim()}
        className="w-full"
      >
        <Send size={13} /> Submit goal
      </Button>
    </div>
  );
}
