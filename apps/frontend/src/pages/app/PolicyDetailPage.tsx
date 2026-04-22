import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Shield, Archive, Edit2, X, Check } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { PolicyBuilder } from "@/components/policy/PolicyBuilder";
import { usePolicy, useUpdatePolicy, useArchivePolicy } from "@/hooks/usePolicy";
import { useToast } from "@/store/uiStore";
import { getErrorMessage } from "@/api/client";
import { formatBnb, formatTimestamp } from "@/lib/utils";
import type { Policy } from "@/api/policy";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border-subtle last:border-b-0">
      <span className="text-xs font-mono text-text-tertiary shrink-0 w-40">{label}</span>
      <span className="text-xs font-sans text-text-secondary text-right">{value}</span>
    </div>
  );
}

export function PolicyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: policy, isLoading } = usePolicy(id!);
  const updatePolicy = useUpdatePolicy(id!);
  const archivePolicy = useArchivePolicy();
  const toast = useToast();

  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Policy>>({});
  const [confirmArchive, setConfirmArchive] = useState(false);

  async function handleSave() {
    try {
      await updatePolicy.mutateAsync(formData);
      toast.success("Policy updated.");
      setEditing(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleArchive() {
    try {
      await archivePolicy.mutateAsync(id!);
      toast.success("Policy archived.");
      navigate("/app/policies");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="p-6 text-center text-text-tertiary font-sans text-sm">Policy not found.</div>
    );
  }

  const statusVariant = policy.status === "ACTIVE" ? "success" : policy.status === "PAUSED" ? "amber" : "default";

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader
        title={policy.name}
        description={policy.description || "No description"}
        back="/app/policies"
        action={
          <div className="flex items-center gap-2">
            {!editing && (
              <Button variant="ghost" size="sm" onClick={() => { setEditing(true); setFormData(policy); }}>
                <Edit2 size={12} /> Edit
              </Button>
            )}
            {editing && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  <X size={12} /> Cancel
                </Button>
                <Button size="sm" onClick={handleSave} loading={updatePolicy.isPending}>
                  <Check size={12} /> Save
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Status */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded bg-amber/12 border border-amber/20 flex items-center justify-center">
          <Shield size={15} className="text-amber" />
        </div>
        <div>
          <Badge variant={statusVariant}>{policy.status}</Badge>
          <p className="text-2xs font-mono text-text-tertiary mt-0.5">v{policy.version} · updated {formatTimestamp(policy.updatedAt)}</p>
        </div>
      </div>

      {editing ? (
        <div className="bg-surface-1 border border-amber/30 rounded-card p-5">
          <PolicyBuilder
            initial={formData}
            onChange={(d) => setFormData(d as Partial<Policy>)}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Limits */}
          <div className="bg-surface-1 border border-border-subtle rounded-card p-4">
            <p className="text-xs font-mono text-text-tertiary uppercase tracking-wider mb-3">Spending limits</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Max transaction", value: formatBnb(policy.maxTransactionBnb) },
                { label: "Approval above", value: formatBnb(policy.approvalThresholdBnb) },
                { label: "Daily limit", value: formatBnb(policy.maxDailySpendBnb) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-surface-2 rounded p-3 border border-border-subtle text-center">
                  <p className="text-2xs text-text-tertiary font-mono mb-1">{label}</p>
                  <p className="text-sm font-mono text-text-primary font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="bg-surface-1 border border-border-subtle rounded-card p-4">
            <p className="text-xs font-mono text-text-tertiary uppercase tracking-wider mb-3">Settings</p>
            <DetailRow label="Max slippage" value={`${(policy.maxSlippageBps / 100).toFixed(2)}% (${policy.maxSlippageBps} bps)`} />
            <DetailRow label="Simulation required" value={policy.simulationRequired ? "Yes" : "No"} />
            <DetailRow label="Wallet address" value={
              <span className="font-mono">{policy.walletAddress.slice(0, 6)}…{policy.walletAddress.slice(-4)}</span>
            } />
          </div>

          {/* Address lists */}
          {(policy.allowedTokenAddresses.length > 0 || policy.blockedTokenAddresses.length > 0) && (
            <div className="bg-surface-1 border border-border-subtle rounded-card p-4">
              <p className="text-xs font-mono text-text-tertiary uppercase tracking-wider mb-3">Token filters</p>
              {policy.allowedTokenAddresses.length > 0 && (
                <DetailRow
                  label="Allowed tokens"
                  value={
                    <div className="flex flex-wrap gap-1 justify-end">
                      {policy.allowedTokenAddresses.map((a) => (
                        <span key={a} className="text-2xs font-mono bg-success/8 border border-success/20 text-success rounded px-1.5 py-0.5">
                          {a.slice(0, 6)}…{a.slice(-4)}
                        </span>
                      ))}
                    </div>
                  }
                />
              )}
              {policy.blockedTokenAddresses.length > 0 && (
                <DetailRow
                  label="Blocked tokens"
                  value={
                    <div className="flex flex-wrap gap-1 justify-end">
                      {policy.blockedTokenAddresses.map((a) => (
                        <span key={a} className="text-2xs font-mono bg-danger/8 border border-danger/20 text-danger rounded px-1.5 py-0.5">
                          {a.slice(0, 6)}…{a.slice(-4)}
                        </span>
                      ))}
                    </div>
                  }
                />
              )}
            </div>
          )}

          {/* Archive */}
          {policy.status !== "ARCHIVED" && (
            <div className="bg-surface-1 border border-border-subtle rounded-card p-4">
              <p className="text-xs font-mono text-text-tertiary uppercase tracking-wider mb-3">Danger zone</p>
              {confirmArchive ? (
                <div className="flex items-center gap-2">
                  <p className="text-xs font-sans text-danger flex-1">Archive this policy? This cannot be undone.</p>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmArchive(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleArchive} loading={archivePolicy.isPending} className="bg-danger/20 border-danger/40 text-danger hover:bg-danger/30">
                    Confirm archive
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setConfirmArchive(true)}>
                  <Archive size={12} /> Archive policy
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
