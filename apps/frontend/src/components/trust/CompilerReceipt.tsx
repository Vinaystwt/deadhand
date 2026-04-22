import { motion } from "framer-motion";
import { Code2, CheckCircle2, XCircle, Shield, FileCheck } from "lucide-react";
import { compilerContainer, compilerLineReveal } from "@/lib/motion";
import { ReasonCodeChip } from "./ReasonCodeChip";
import { cn } from "@/lib/utils";
import type { CompilerReceipt as CompilerReceiptType } from "@/api/policy";

interface CompilerReceiptProps {
  receipt: CompilerReceiptType;
}

const decisionStyles: Record<string, string> = {
  BLOCK: "text-danger-bright bg-danger/8 border-danger/22",
  WARN: "text-amber bg-amber/8 border-amber/22",
  REQUIRES_APPROVAL: "text-amber bg-amber/8 border-amber/22",
};

export function CompilerReceipt({ receipt }: CompilerReceiptProps) {
  return (
    // Double-bezel amber treatment
    <div
      className="rounded-[10px] p-[1.5px]"
      style={{
        background: "rgba(212,168,67,0.06)",
        border: "1px solid rgba(212,168,67,0.18)",
        boxShadow: "0 0 24px rgba(212,168,67,0.05)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-card bg-surface-1 overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 100% 40% at 50% 0%, rgba(212,168,67,0.06) 0%, transparent 55%), #111113",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        {/* Top accent bar */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-amber/60 to-transparent" />

        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-card bg-amber/12 border border-amber/22 flex items-center justify-center">
                <Code2 size={14} className="text-amber" />
              </div>
              <div>
                <p className="text-sm font-bold font-display text-text-primary tracking-tight">
                  Policy Compiler Receipt
                </p>
                <p className="text-2xs text-text-tertiary font-mono">
                  {receipt.enforceableArtifact.artifactType} · v{receipt.enforceableArtifact.compilerVersion}
                </p>
              </div>
            </div>
            {receipt.validation.valid ? (
              <span className="inline-flex items-center gap-1 text-2xs font-mono text-success bg-success/8 border border-success/20 px-2 py-1 rounded-badge">
                <CheckCircle2 size={10} /> VALID
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-2xs font-mono text-danger-bright bg-danger/8 border border-danger/20 px-2 py-1 rounded-badge">
                <XCircle size={10} /> INVALID
              </span>
            )}
          </div>

          {/* Original intent — quoted */}
          <div className="bg-surface-2 rounded-card p-3 border border-border-subtle">
            <p className="text-2xs text-text-tertiary font-mono uppercase tracking-wider mb-1.5">
              Your intent
            </p>
            <p className="text-sm text-amber font-sans italic leading-relaxed">
              "{receipt.originalIntent}"
            </p>
          </div>

          {/* Rules — sequential reveal */}
          <div>
            <p className="text-2xs text-text-tertiary font-mono uppercase tracking-wider mb-2.5">
              Enforcement rules ({receipt.enforceableArtifact.ruleCount})
            </p>
            <motion.div
              variants={compilerContainer}
              initial="initial"
              animate="animate"
              className="space-y-1.5"
            >
              {receipt.compiledRules.map((rule, i) => (
                <motion.div
                  key={i}
                  variants={compilerLineReveal}
                  className="flex items-start gap-3 bg-surface-2 rounded p-2.5 border border-border-subtle"
                >
                  <span
                    className={cn(
                      "shrink-0 text-2xs font-mono border rounded px-1.5 py-0.5 whitespace-nowrap",
                      decisionStyles[rule.decision] ?? "text-text-tertiary bg-surface-3 border-border-subtle"
                    )}
                  >
                    {rule.decision}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xs font-mono text-text-tertiary mb-0.5">{rule.ruleType}</p>
                    <p className="text-xs text-text-secondary font-sans leading-relaxed">
                      {rule.explanation}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Validation errors */}
          {!receipt.validation.valid && receipt.validation.errors.length > 0 && (
            <div className="bg-danger/6 border border-danger/20 rounded-card p-3">
              <p className="text-2xs font-mono text-danger uppercase tracking-wider mb-2">
                Validation errors
              </p>
              {receipt.validation.errors.map((err, i) => (
                <p key={i} className="text-xs text-danger-bright font-sans">
                  {err}
                </p>
              ))}
            </div>
          )}

          {/* Artifact footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
            <div className="flex items-center gap-2">
              <ReasonCodeChip code={receipt.validation.reasonCode} />
              {receipt.presetName && (
                <span className="text-2xs font-mono text-text-tertiary">
                  {receipt.presetName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-2xs text-text-tertiary font-mono">
              <Shield size={10} className="text-amber" />
              AI interpreted · Deadhand enforces
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function CompilerReceiptLoading() {
  return (
    <div className="rounded-card border border-amber/20 bg-surface-1 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-card bg-amber/12 border border-amber/20 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          >
            <FileCheck size={14} className="text-amber" />
          </motion.div>
        </div>
        <div>
          <p className="text-sm font-bold font-display text-text-primary tracking-tight">
            Compiling policy intent...
          </p>
          <p className="text-2xs text-text-tertiary font-mono">
            Translating to enforceable rules
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {[55, 70, 45, 80].map((w, i) => (
          <div
            key={i}
            className="h-9 bg-surface-2 rounded animate-pulse border border-border-subtle"
            style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
