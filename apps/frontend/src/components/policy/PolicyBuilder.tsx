import { useState } from "react";
import { Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Policy } from "@/api/policy";

type PolicyFormData = Omit<Policy, "id" | "userId" | "version" | "createdAt" | "updatedAt">;

interface PolicyBuilderProps {
  initial?: Partial<PolicyFormData>;
  onChange: (data: Partial<PolicyFormData>) => void;
}

const ACTION_TYPES = ["SWAP", "TRANSFER", "APPROVE", "STAKE", "UNSTAKE", "BRIDGE"];

function AddressListField({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function add() {
    const val = input.trim();
    if (val && !values.includes(val)) {
      onChange([...values, val]);
      setInput("");
    }
  }

  return (
    <div>
      <p className="text-xs font-mono text-text-tertiary mb-1.5">{label}</p>
      <div className="flex gap-2 mb-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="0x..."
          className="font-mono text-xs"
        />
        <Button variant="secondary" size="sm" onClick={add} type="button">
          <Plus size={12} />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 text-2xs font-mono bg-surface-2 border border-border-subtle rounded px-2 py-0.5 text-text-secondary"
            >
              {v.slice(0, 6)}…{v.slice(-4)}
              <button type="button" onClick={() => onChange(values.filter((x) => x !== v))}>
                <X size={10} className="text-text-tertiary hover:text-danger" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function PolicyBuilder({ initial = {}, onChange }: PolicyBuilderProps) {
  const [form, setForm] = useState<Partial<PolicyFormData>>({
    name: "",
    description: "",
    walletAddress: "",
    status: "ACTIVE",
    emergencyPaused: false,
    approvalThresholdBnb: "0.1",
    maxTransactionBnb: "1.0",
    maxDailySpendBnb: "5.0",
    maxSlippageBps: 100,
    simulationRequired: true,
    allowedTokenAddresses: [],
    blockedTokenAddresses: [],
    allowedContractAddresses: [],
    blockedContractAddresses: [],
    allowedActionTypes: [],
    blockedActionTypes: [],
    ...initial,
  });
  const [advancedOpen, setAdvancedOpen] = useState(false);

  function update(patch: Partial<PolicyFormData>) {
    const next = { ...form, ...patch };
    setForm(next);
    onChange(next);
  }

  function toggleActionType(type: string, list: "allowedActionTypes" | "blockedActionTypes") {
    const current = (form[list] as string[]) ?? [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    update({ [list]: updated });
  }

  return (
    <div className="space-y-5">
      {/* Name + Description */}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-mono text-text-tertiary block mb-1.5">Policy name *</label>
          <Input
            value={form.name ?? ""}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="e.g. Launch Guard Safe"
          />
        </div>
        <div>
          <label className="text-xs font-mono text-text-tertiary block mb-1.5">Description</label>
          <Input
            value={form.description ?? ""}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="Optional description"
          />
        </div>
      </div>

      {/* Spending limits */}
      <div>
        <p className="text-xs font-mono text-text-tertiary uppercase tracking-wider mb-3">Spending limits</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Max tx (BNB)", field: "maxTransactionBnb" as const },
            { label: "Approval above (BNB)", field: "approvalThresholdBnb" as const },
            { label: "Daily limit (BNB)", field: "maxDailySpendBnb" as const },
          ].map(({ label, field }) => (
            <div key={field}>
              <label className="text-2xs font-mono text-text-tertiary block mb-1">{label}</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={(form[field] as string) ?? ""}
                onChange={(e) => update({ [field]: e.target.value })}
                className="font-mono text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Slippage + simulation */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-2xs font-mono text-text-tertiary block mb-1">Max slippage (bps)</label>
          <Input
            type="number"
            min="0"
            max="10000"
            value={form.maxSlippageBps ?? 100}
            onChange={(e) => update({ maxSlippageBps: parseInt(e.target.value) || 0 })}
            className="font-mono text-xs"
          />
          <p className="text-2xs text-text-tertiary mt-0.5 font-mono">{((form.maxSlippageBps ?? 100) / 100).toFixed(2)}%</p>
        </div>
        <div className="flex flex-col justify-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.simulationRequired ?? true}
              onChange={(e) => update({ simulationRequired: e.target.checked })}
              className="w-3.5 h-3.5 rounded border border-border-medium bg-surface-2 accent-amber"
            />
            <span className="text-xs font-sans text-text-secondary">Require simulation</span>
          </label>
          <p className="text-2xs text-text-tertiary mt-1 font-sans">
            Block execution without successful sim
          </p>
        </div>
      </div>

      {/* Allowed action types */}
      <div>
        <p className="text-xs font-mono text-text-tertiary uppercase tracking-wider mb-2">Allowed action types</p>
        <p className="text-2xs text-text-tertiary font-sans mb-2">Leave empty to allow all. Select to restrict.</p>
        <div className="flex flex-wrap gap-1.5">
          {ACTION_TYPES.map((type) => {
            const allowed = (form.allowedActionTypes ?? []).includes(type);
            const blocked = (form.blockedActionTypes ?? []).includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  if (!allowed && !blocked) toggleActionType(type, "allowedActionTypes");
                  else if (allowed) {
                    update({ allowedActionTypes: (form.allowedActionTypes ?? []).filter((t) => t !== type) });
                    toggleActionType(type, "blockedActionTypes");
                  } else {
                    update({ blockedActionTypes: (form.blockedActionTypes ?? []).filter((t) => t !== type) });
                  }
                }}
                className={[
                  "text-2xs font-mono px-2.5 py-1 rounded border transition-colors",
                  allowed ? "border-success/50 bg-success/8 text-success" :
                  blocked ? "border-danger/50 bg-danger/8 text-danger" :
                  "border-border-subtle bg-surface-2 text-text-tertiary hover:border-border-medium",
                ].join(" ")}
              >
                {allowed ? "✓ " : blocked ? "✗ " : ""}{type}
              </button>
            );
          })}
        </div>
        <p className="text-2xs text-text-tertiary font-sans mt-1.5">Click: neutral → allowed → blocked → neutral</p>
      </div>

      {/* Advanced collapsible */}
      <div className="border border-border-subtle rounded-card overflow-hidden">
        <button
          type="button"
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-2/50 transition-colors"
        >
          <span className="text-xs font-mono text-text-tertiary uppercase tracking-wider">Advanced address filters</span>
          {advancedOpen ? <ChevronUp size={13} className="text-text-tertiary" /> : <ChevronDown size={13} className="text-text-tertiary" />}
        </button>
        {advancedOpen && (
          <div className="px-4 pb-4 space-y-4 border-t border-border-subtle">
            <AddressListField
              label="Allowed token addresses"
              values={(form.allowedTokenAddresses as string[]) ?? []}
              onChange={(v) => update({ allowedTokenAddresses: v })}
            />
            <AddressListField
              label="Blocked token addresses"
              values={(form.blockedTokenAddresses as string[]) ?? []}
              onChange={(v) => update({ blockedTokenAddresses: v })}
            />
            <AddressListField
              label="Allowed contract addresses"
              values={(form.allowedContractAddresses as string[]) ?? []}
              onChange={(v) => update({ allowedContractAddresses: v })}
            />
            <AddressListField
              label="Blocked contract addresses"
              values={(form.blockedContractAddresses as string[]) ?? []}
              onChange={(v) => update({ blockedContractAddresses: v })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
