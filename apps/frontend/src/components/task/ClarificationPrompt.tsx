import { useState } from "react";
import { HelpCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { taskApi } from "@/api/task";
import { useToast } from "@/store/uiStore";
import { getErrorMessage } from "@/api/client";
import type { Task } from "@/api/task";
import { motion } from "framer-motion";
import { cardReveal } from "@/lib/motion";

interface ClarificationPromptProps {
  task: Task;
  onClarified: (task: Task) => void;
}

export function ClarificationPrompt({ task, onClarified }: ClarificationPromptProps) {
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const question = task.parsedIntent?.clarificationQuestion ?? "Please provide more detail about your goal.";

  async function handleSubmit() {
    if (!answer.trim()) return;
    setLoading(true);
    try {
      const updated = await taskApi.clarify(task.id, answer.trim());
      onClarified(updated);
      setAnswer("");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      variants={cardReveal}
      initial="initial"
      animate="animate"
      className="bg-surface-1 border border-steel/25 rounded-card p-4 space-y-3"
    >
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded bg-steel/12 border border-steel/20 flex items-center justify-center shrink-0">
          <HelpCircle size={13} className="text-steel-bright" />
        </div>
        <div>
          <p className="text-sm font-semibold font-display text-text-primary mb-0.5">Clarification needed.</p>
          <p className="text-sm text-text-secondary font-sans leading-relaxed">{question}</p>
        </div>
      </div>

      <Textarea
        placeholder="Your answer..."
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={2}
      />

      <Button variant="secondary" size="sm" onClick={handleSubmit} loading={loading} disabled={!answer.trim()}>
        <Send size={13} /> Answer
      </Button>
    </motion.div>
  );
}
