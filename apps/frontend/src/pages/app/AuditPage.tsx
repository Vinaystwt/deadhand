import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { AuditEventRow } from "@/components/replay/AuditEventRow";
import { useAuditEvents } from "@/hooks/useAudit";

const SEVERITY_FILTERS = ["ALL", "CRITICAL", "HIGH", "WARNING", "INFO"] as const;

export function AuditPage() {
  const [severity, setSeverity] = useState<string>("ALL");
  const [eventType, setEventType] = useState<string>("");

  const { data: events, isLoading } = useAuditEvents({
    severity: severity === "ALL" ? undefined : severity,
    eventType: eventType || undefined,
    limit: 100,
  });

  const criticalCount = events?.filter((e) => e.metadata?.severity === "CRITICAL").length ?? 0;
  const highCount = events?.filter((e) => e.metadata?.severity === "HIGH").length ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Audit Log"
        description="Complete tamper-evident record of Deadhand enforcement events"
      />

      {/* Summary */}
      {!isLoading && events && (
        <div className="flex items-center gap-4 mb-5 p-3 bg-surface-1 border border-border-subtle rounded-card">
          <span className="text-xs font-mono text-text-tertiary">{events.length} events</span>
          {criticalCount > 0 && (
            <span className="flex items-center gap-1.5">
              <Badge variant="danger" size="sm">CRITICAL</Badge>
              <span className="text-xs font-mono text-text-secondary">{criticalCount}</span>
            </span>
          )}
          {highCount > 0 && (
            <span className="flex items-center gap-1.5">
              <Badge variant="amber" size="sm">HIGH</Badge>
              <span className="text-xs font-mono text-text-secondary">{highCount}</span>
            </span>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1">
          {SEVERITY_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={[
                "text-2xs font-mono px-2.5 py-1 rounded border transition-colors",
                severity === s
                  ? "border-amber/40 bg-amber/8 text-amber"
                  : "border-border-subtle bg-surface-2 text-text-tertiary hover:border-border-medium",
              ].join(" ")}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          placeholder="Filter by event type..."
          className="bg-surface-2 border border-border-subtle rounded px-2.5 py-1 text-2xs font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-amber/50 transition-colors"
        />
      </div>

      {/* Events */}
      <div className="bg-surface-1 border border-border-subtle rounded-card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : events?.length === 0 ? (
          <div className="py-8 text-center text-text-tertiary font-sans text-sm">
            No events found.
          </div>
        ) : (
          events?.map((event) => (
            <AuditEventRow key={event.id} event={event} />
          ))
        )}
      </div>
    </div>
  );
}
