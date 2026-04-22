import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { PolicyCard } from "@/components/policy/PolicyCard";
import { PresetGrid } from "@/components/policy/PresetGrid";
import { PolicyBuilder } from "@/components/policy/PolicyBuilder";
import { CompilerInput } from "@/components/policy/CompilerInput";
import { usePolicies, usePolicyPresets, useCreatePolicy } from "@/hooks/usePolicy";
import { useToast } from "@/store/uiStore";
import { getErrorMessage } from "@/api/client";
import type { Policy, CompilerReceipt, PolicyPreset } from "@/api/policy";

type CreateMode = "preset" | "builder" | "compiler" | null;

export function PoliciesPage() {
  const { data: policies, isLoading } = usePolicies();
  const { data: presets } = usePolicyPresets();
  const createPolicy = useCreatePolicy();
  const toast = useToast();

  const [mode, setMode] = useState<CreateMode>(null);
  const [selectedPreset, setSelectedPreset] = useState<PolicyPreset | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [compiledData, setCompiledData] = useState<CompilerReceipt | null>(null);
  const [tab, setTab] = useState<"preset" | "builder" | "nl">("preset");

  function openCreate() {
    setMode("preset");
    setSelectedPreset(null);
    setFormData({});
    setCompiledData(null);
  }

  async function handleCreate() {
    try {
      let payload: Record<string, unknown> = { ...formData };

      if (selectedPreset?.policy) {
        payload = { ...selectedPreset.policy, ...payload };
      }
      if (compiledData?.compiledPolicy) {
        payload = { ...compiledData.compiledPolicy, ...payload };
      }

      if (!payload.name) {
        toast.error("Policy name is required.");
        return;
      }

      await createPolicy.mutateAsync(payload as never);
      toast.success("Policy created.");
      setMode(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const activePolicies = policies?.filter((p) => p.status !== "ARCHIVED") ?? [];
  const archivedPolicies = policies?.filter((p) => p.status === "ARCHIVED") ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Policies"
        description="Define the rules Deadhand enforces on every operation"
        action={
          <Button onClick={openCreate} size="sm">
            <Plus size={13} /> New policy
          </Button>
        }
      />

      {/* Create panel */}
      <AnimatePresence>
        {mode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-surface-1 border border-amber/30 rounded-card p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold font-display text-text-primary">Create new policy</p>
                <button
                  onClick={() => setMode(null)}
                  className="text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-surface-2 p-1 rounded-lg mb-5 w-fit">
                {(["preset", "builder", "nl"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={[
                      "text-xs font-mono px-3 py-1.5 rounded transition-colors",
                      tab === t
                        ? "bg-surface-1 text-text-primary border border-border-subtle"
                        : "text-text-tertiary hover:text-text-secondary",
                    ].join(" ")}
                  >
                    {t === "preset" ? "From preset" : t === "builder" ? "Build rules" : "Natural language"}
                  </button>
                ))}
              </div>

              {tab === "preset" && presets && (
                <div className="space-y-4">
                  <PresetGrid
                    presets={presets}
                    selected={selectedPreset?.key}
                    onSelect={(p) => {
                      setSelectedPreset(p);
                      setFormData({ name: p.name, ...p.policy });
                    }}
                  />
                  {selectedPreset && (
                    <PolicyBuilder
                      initial={{ name: selectedPreset.name, ...selectedPreset.policy } as never}
                      onChange={(d) => setFormData(d as never)}
                    />
                  )}
                </div>
              )}

              {tab === "builder" && (
                <PolicyBuilder
                  onChange={(d) => setFormData(d as never)}
                />
              )}

              {tab === "nl" && (
                <CompilerInput
                  presetKey={selectedPreset?.key}
                  onCompiled={(receipt) => {
                    setCompiledData(receipt);
                    setFormData((prev) => ({
                      ...receipt.compiledPolicy,
                      name: prev.name || receipt.presetName || "",
                    }));
                  }}
                />
              )}

              <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-border-subtle">
                <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreate}
                  loading={createPolicy.isPending}
                  disabled={!formData.name}
                >
                  Create policy
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : activePolicies.length === 0 && !mode ? (
        <div className="text-center py-16 bg-surface-1 border border-border-subtle rounded-card">
          <p className="text-text-tertiary font-sans text-sm mb-2">No policies yet.</p>
          <Button onClick={openCreate} size="sm">
            <Plus size={13} /> Create your first policy
          </Button>
        </div>
      ) : (
        <>
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {activePolicies.map((policy) => (
              <motion.div key={policy.id} variants={staggerItem}>
                <PolicyCard
                  policy={policy}
                  onUpdated={(p: Policy) => {
                    /* invalidated by mutation */
                    void p;
                  }}
                />
              </motion.div>
            ))}
          </motion.div>

          {archivedPolicies.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-mono text-text-tertiary uppercase tracking-wider mb-3">Archived</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-50">
                {archivedPolicies.map((policy) => (
                  <PolicyCard key={policy.id} policy={policy} onUpdated={() => {}} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
