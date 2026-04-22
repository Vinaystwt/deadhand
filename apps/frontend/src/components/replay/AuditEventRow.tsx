import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SeverityBadge } from "@/components/trust/SeverityBadge";
import { Badge } from "@/components/ui/Badge";
import { formatTimestamp } from "@/lib/utils";
import type { AuditEvent } from "@/api/audit";

interface AuditEventRowProps {
  event: AuditEvent;
}

export function AuditEventRow({ event }: AuditEventRowProps) {
  const [expanded, setExpanded] = useState(false);
  const severity = (event.metadata?.severity as string) ?? "INFO";
  const storyClass = event.metadata?.storyClass as string | undefined;

  return (
    <div className="border-b border-border-subtle last:border-b-0">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-2/50 transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="shrink-0">
          <SeverityBadge severity={severity as "INFO" | "WARNING" | "HIGH" | "CRITICAL"} />
        </div>

        <div className="flex-1 min-w-0 flex items-center gap-3">
          <span className="text-xs font-mono text-text-primary shrink-0">{event.eventType}</span>
          {storyClass && (
            <Badge variant="steel" size="sm">{storyClass}</Badge>
          )}
          {event.taskId && (
            <span className="text-2xs font-mono text-text-tertiary truncate">
              task:{event.taskId.slice(0, 8)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-2xs font-mono text-text-tertiary">
            {event.timestamp ? formatTimestamp(event.timestamp) : "—"}
          </span>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.12 }}>
            <ChevronDown size={12} className="text-text-tertiary" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <pre className="px-4 pb-3 text-2xs font-mono text-text-tertiary bg-surface-2/30 whitespace-pre-wrap overflow-auto max-h-48">
              {JSON.stringify(event.metadata, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
