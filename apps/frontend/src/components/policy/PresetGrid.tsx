import { motion } from "framer-motion";
import { ShieldCheck, Zap, Lock, type LucideIcon } from "lucide-react";
import { staggerContainer, staggerItem } from "@/lib/motion";
import type { PolicyPreset } from "@/api/policy";

interface PresetGridProps {
  presets: PolicyPreset[];
  selected?: string;
  onSelect: (preset: PolicyPreset) => void;
}

const presetIcons: Record<string, LucideIcon> = {
  "launch-guard-safe": ShieldCheck,
  "launch-guard-aggressive": Zap,
  "treasury-lockdown": Lock,
};

const presetColors: Record<string, string> = {
  "launch-guard-safe": "border-success/30 hover:border-success/50 data-[selected=true]:border-success/60 data-[selected=true]:bg-success/8",
  "launch-guard-aggressive": "border-amber/30 hover:border-amber/50 data-[selected=true]:border-amber/60 data-[selected=true]:bg-amber/8",
  "treasury-lockdown": "border-steel/30 hover:border-steel/50 data-[selected=true]:border-steel/60 data-[selected=true]:bg-steel/8",
};

const presetIconColors: Record<string, string> = {
  "launch-guard-safe": "text-success",
  "launch-guard-aggressive": "text-amber",
  "treasury-lockdown": "text-steel-bright",
};

export function PresetGrid({ presets, selected, onSelect }: PresetGridProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="grid grid-cols-1 sm:grid-cols-3 gap-3"
    >
      {presets.map((preset) => {
        const Icon = presetIcons[preset.key] ?? ShieldCheck;
        const colorClass = presetColors[preset.key] ?? "border-border-subtle hover:border-border-medium";
        const iconColor = presetIconColors[preset.key] ?? "text-text-secondary";

        return (
          <motion.button
            key={preset.key}
            variants={staggerItem}
            data-selected={selected === preset.key}
            onClick={() => onSelect(preset)}
            className={`bg-surface-1 border rounded-card p-4 text-left transition-all duration-150 ${colorClass}`}
          >
            <Icon size={18} className={`${iconColor} mb-3`} />
            <p className="text-sm font-semibold font-display text-text-primary mb-2">{preset.name}</p>
            <ul className="space-y-1">
              {preset.summary.map((s, i) => (
                <li key={i} className="text-xs text-text-secondary font-sans flex items-start gap-1.5">
                  <span className={`${iconColor} mt-0.5 shrink-0`}>·</span>
                  {s}
                </li>
              ))}
            </ul>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
