import { Link } from "react-router-dom";
import { Shield, Pause, Play, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatBnb } from "@/lib/utils";
import { policyApi, type Policy } from "@/api/policy";
import { useToast } from "@/store/uiStore";
import { getErrorMessage } from "@/api/client";
import { useState } from "react";

interface PolicyCardProps {
  policy: Policy;
  onUpdated: (p: Policy) => void;
}

export function PolicyCard({ policy, onUpdated }: PolicyCardProps) {
  const [toggling, setToggling] = useState(false);
  const toast = useToast();

  const statusVariant = policy.status === "ACTIVE" ? "success" : policy.status === "PAUSED" ? "amber" : "default";

  async function handleTogglePause() {
    setToggling(true);
    try {
      const updated = policy.status === "PAUSED"
        ? await policyApi.resume(policy.id)
        : await policyApi.pause(policy.id);
      onUpdated(updated);
      toast.success(updated.status === "PAUSED" ? "Policy paused." : "Policy resumed.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-card p-4 group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded bg-amber/12 border border-amber/20 flex items-center justify-center shrink-0 mt-0.5">
            <Shield size={13} className="text-amber" />
          </div>
          <div>
            <Link
              to={`/app/policies/${policy.id}`}
              className="text-sm font-semibold font-display text-text-primary hover:text-amber transition-colors group-hover:text-amber"
            >
              {policy.name}
            </Link>
            {policy.description && (
              <p className="text-xs text-text-tertiary font-sans mt-0.5">{policy.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant} size="sm">{policy.status}</Badge>
          <Link
            to={`/app/policies/${policy.id}`}
            className="p-1 text-text-tertiary hover:text-text-primary hover:bg-surface-2 rounded transition-colors"
          >
            <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      {/* Key limits */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: "Max tx", value: formatBnb(policy.maxTransactionBnb) },
          { label: "Approval above", value: formatBnb(policy.approvalThresholdBnb) },
          { label: "Daily limit", value: formatBnb(policy.maxDailySpendBnb) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface-2 rounded p-2 border border-border-subtle text-center">
            <p className="text-2xs text-text-tertiary font-mono mb-0.5">{label}</p>
            <p className="text-xs font-mono text-text-primary">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleTogglePause}
          loading={toggling}
          disabled={policy.status === "ARCHIVED"}
        >
          {policy.status === "PAUSED" ? <Play size={12} /> : <Pause size={12} />}
          {policy.status === "PAUSED" ? "Resume" : "Pause"}
        </Button>
        <span className="text-2xs font-mono text-text-tertiary">v{policy.version}</span>
      </div>
    </div>
  );
}
