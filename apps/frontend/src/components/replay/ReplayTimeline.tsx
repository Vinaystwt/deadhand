import { motion } from "framer-motion";
import { replayContainer } from "@/lib/motion";
import { ReplayStepComponent } from "./ReplayStep";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { formatTimestamp } from "@/lib/utils";
import type { ReplayStory } from "@/api/task";
import { Clock } from "lucide-react";

interface ReplayTimelineProps {
  story: ReplayStory | null;
  loading?: boolean;
}

function statusVariant(status: string): "amber" | "success" | "danger" | "steel" | "default" {
  switch (status) {
    case "COMPLETED": return "success";
    case "CANCELLED": case "FAILED": return "danger";
    case "ACTIVE": return "amber";
    default: return "default";
  }
}

export function ReplayTimeline({ story, loading }: ReplayTimelineProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-text-tertiary font-sans">Reconstructing audit story...</p>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="text-center py-8 text-text-tertiary text-sm font-sans">
        No replay available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-surface-1 border border-border-subtle rounded-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-mono text-text-tertiary uppercase tracking-wider mb-1">Audit Story</p>
            <p className="text-base font-semibold font-display text-text-primary">{story.goal}</p>
          </div>
          <Badge variant={statusVariant(story.status)}>{story.status}</Badge>
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-2xs font-mono text-text-tertiary">
          <Clock size={11} />
          Generated {formatTimestamp(story.generatedAt)}
          <span className="text-border-medium mx-1">·</span>
          {story.steps.length} steps
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-surface-1 border border-border-subtle rounded-card p-4">
        <p className="text-xs font-mono text-text-tertiary uppercase tracking-wider mb-4">Decision trail</p>
        <motion.div
          variants={replayContainer}
          initial="initial"
          animate="animate"
          className="space-y-0"
        >
          {story.steps.map((step, i) => (
            <ReplayStepComponent
              key={i}
              step={step}
              index={i}
              isLast={i === story.steps.length - 1}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
