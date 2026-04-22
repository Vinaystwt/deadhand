import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Zap, ShieldX, RotateCcw, CheckCircle2 } from "lucide-react";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { VetoCard } from "@/components/trust/VetoCard";
import { SafetyCard } from "@/components/trust/SafetyCard";
import { CompilerReceipt } from "@/components/trust/CompilerReceipt";
import { policyApi } from "@/api/policy";
import { taskApi } from "@/api/task";
import { emergencyApi } from "@/api/emergency";
import { useToast } from "@/store/uiStore";
import { getErrorMessage } from "@/api/client";
import type { Policy, CompilerReceipt as CompilerReceiptType } from "@/api/policy";
import type { Task, Action } from "@/api/task";

type DemoStep = "intro" | "compile" | "submit" | "veto" | "approval" | "kill";

const DEMO_INTENTS = [
  {
    label: "Safe swap",
    text: "Swap 0.05 BNB for CAKE on PancakeSwap with max 1% slippage",
    description: "Should auto-approve under policy limits",
    expectedDecision: "AUTO_APPROVED" as const,
  },
  {
    label: "Large transfer (blocked)",
    text: "Send 10 BNB to 0x742d35Cc6634C0532925a3b8D4C9C2C2a1234567",
    description: "Should be vetoed — exceeds max transaction limit",
    expectedDecision: "BLOCKED" as const,
  },
  {
    label: "Approval required",
    text: "Buy 0.5 BNB of CAKE through PancakeSwap",
    description: "Should require your manual approval without triggering a hard veto",
    expectedDecision: "REQUIRES_APPROVAL" as const,
  },
];

export function DemoPage() {
  const toast = useToast();
  const [step, setStep] = useState<DemoStep>("intro");
  const [compiling, setCompiling] = useState(false);
  const [receipt, setReceipt] = useState<CompilerReceiptType | null>(null);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [selectedIntent, setSelectedIntent] = useState(DEMO_INTENTS[0]);
  const [demoWalletStatus, setDemoWalletStatus] = useState<{
    configured: boolean;
    address?: string;
    balanceBnb?: string;
  } | null>(null);

  async function handleCompile() {
    setCompiling(true);
    try {
      const r = await policyApi.compile(
        "Safe DeFi operation: max 1 BNB per transaction, require approval above 0.1 BNB, max 1% slippage, simulation required",
        "launch-guard-safe"
      );
      setReceipt(r);

      const p = await policyApi.create({
        ...r.compiledPolicy as object,
        name: "Demo Policy — Launch Guard Safe",
        description: "Auto-generated demo policy",
        status: "ACTIVE",
        approvalThresholdBnb: "0.1",
        maxTransactionBnb: "1.0",
        maxDailySpendBnb: "1.0",
        maxSlippageBps: 100,
        simulationRequired: true,
        allowedTokenAddresses: [],
        blockedTokenAddresses: [],
        allowedContractAddresses: [],
        blockedContractAddresses: [],
        allowedActionTypes: [],
        blockedActionTypes: [],
      });
      setPolicy(p);
      setStep("submit");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCompiling(false);
    }
  }

  async function handleSubmit() {
    if (!policy) return;
    setSubmitting(true);
    try {
      const t = await taskApi.create(policy.id, selectedIntent.text);
      setTask(t);

      if (t.status === "NEEDS_CLARIFICATION") {
        toast.warning(t.parsedIntent?.clarificationQuestion ?? "Deadhand needs clarification before planning.");
        return;
      }

      const decision = t.actions[0]?.policyDecision;
      if (decision === "BLOCKED") setStep("veto");
      else if (decision === "REQUIRES_APPROVAL") setStep("approval");
      else setStep("kill");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function checkDemoWallet() {
    try {
      const status = await emergencyApi.demoWalletStatus();
      setDemoWalletStatus(status);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function reset() {
    setStep("intro");
    setReceipt(null);
    setPolicy(null);
    setTask(null);
    setDemoWalletStatus(null);
  }

  const vetoedAction = task?.actions.find((a) => a.policyDecision === "BLOCKED");
  const approvalAction = task?.actions.find((a) => a.policyDecision === "REQUIRES_APPROVAL");

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader
        title="Interactive Demo"
        description="Walk through Deadhand's enforcement model step by step"
        action={
          step !== "intro" ? (
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw size={12} /> Reset demo
            </Button>
          ) : undefined
        }
      />

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
        {[
          { key: "intro", label: "Start" },
          { key: "compile", label: "Compile" },
          { key: "submit", label: "Submit" },
          { key: "veto", label: "Veto" },
          { key: "approval", label: "Approval" },
          { key: "kill", label: "Kill switch" },
        ].map((s, i, arr) => {
          const steps: DemoStep[] = ["intro", "compile", "submit", "veto", "approval", "kill"];
          const currentIdx = steps.indexOf(step);
          const thisIdx = steps.indexOf(s.key as DemoStep);
          const done = thisIdx < currentIdx;
          const active = thisIdx === currentIdx;

          return (
            <div key={s.key} className="flex items-center gap-2 shrink-0">
              <div
                className={[
                  "w-6 h-6 rounded-full flex items-center justify-center text-2xs font-mono border transition-colors",
                  done ? "bg-success/20 border-success/40 text-success" :
                  active ? "bg-amber/20 border-amber/40 text-amber" :
                  "bg-surface-2 border-border-subtle text-text-tertiary",
                ].join(" ")}
              >
                {done ? <CheckCircle2 size={12} /> : i + 1}
              </div>
              <span className={`text-2xs font-mono ${active ? "text-amber" : done ? "text-text-secondary" : "text-text-tertiary"}`}>
                {s.label}
              </span>
              {i < arr.length - 1 && <div className="w-6 h-px bg-border-subtle" />}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* Intro */}
        {step === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            <div className="bg-surface-1 border border-amber/20 rounded-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber/12 border border-amber/20 flex items-center justify-center">
                  <Shield size={20} className="text-amber" />
                </div>
                <div>
                  <p className="text-base font-semibold font-display text-text-primary">Deadhand demo</p>
                  <p className="text-xs text-text-tertiary font-sans">AI interprets · Deadhand decides · You sign</p>
                </div>
              </div>
              <p className="text-sm font-sans text-text-secondary leading-relaxed mb-4">
                This demo walks you through the core enforcement surfaces. You'll compile a policy,
                submit a goal, and see how Deadhand blocks, flags, and routes operations.
                All actions use a demo wallet — no real funds.
              </p>

              <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { icon: Shield, label: "Policy compiler", desc: "Rules become enforceable artifacts", color: "text-amber" },
                  { icon: ShieldX, label: "Veto engine", desc: "Hard blocks on policy violations", color: "text-danger" },
                  { icon: Zap, label: "Kill switch", desc: "Instant halt on all operations", color: "text-steel-bright" },
                ].map(({ icon: Icon, label, desc, color }) => (
                  <motion.div
                    key={label}
                    variants={staggerItem}
                    className="bg-surface-2 border border-border-subtle rounded-card p-3"
                  >
                    <Icon size={16} className={`${color} mb-2`} />
                    <p className="text-xs font-semibold font-display text-text-primary mb-1">{label}</p>
                    <p className="text-2xs font-sans text-text-tertiary">{desc}</p>
                  </motion.div>
                ))}
              </motion.div>

              <Button onClick={() => setStep("compile")} className="w-full">
                Begin demo →
              </Button>
            </div>
          </motion.div>
        )}

        {/* Compile */}
        {step === "compile" && (
          <motion.div
            key="compile"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            <div className="bg-surface-1 border border-border-subtle rounded-card p-5">
              <p className="text-xs font-mono text-text-tertiary uppercase tracking-wider mb-3">Step 1 — Compile policy</p>
              <p className="text-sm font-sans text-text-secondary mb-4 leading-relaxed">
                Natural language intent is compiled into an enforceable artifact. The AI interprets.
                Deadhand creates the rule set. No AI touches execution.
              </p>

              {receipt ? (
                <>
                  <CompilerReceipt receipt={receipt} />
                  <Button onClick={() => setStep("submit")} className="mt-4 w-full">
                    Policy compiled → Continue
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleCompile}
                  loading={compiling}
                  className="w-full"
                >
                  {compiling ? "Compiling..." : "Compile Launch Guard Safe preset"}
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {/* Submit */}
        {step === "submit" && (
          <motion.div
            key="submit"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            <div className="bg-surface-1 border border-border-subtle rounded-card p-5">
              <p className="text-xs font-mono text-text-tertiary uppercase tracking-wider mb-3">Step 2 — Submit a goal</p>
              <p className="text-sm font-sans text-text-secondary mb-4 leading-relaxed">
                Describe what you want to do. Deadhand's policy engine evaluates each action
                against the compiled rules before any execution.
              </p>

              <div className="space-y-2 mb-4">
                {DEMO_INTENTS.map((intent) => (
                  <button
                    key={intent.label}
                    onClick={() => setSelectedIntent(intent)}
                    className={[
                      "w-full text-left p-3 rounded-card border transition-all",
                      selectedIntent.label === intent.label
                        ? "border-amber/40 bg-amber/8"
                        : "border-border-subtle bg-surface-2/50 hover:border-border-medium",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold font-display text-text-primary">{intent.label}</span>
                      <Badge
                        variant={
                          intent.expectedDecision === "BLOCKED" ? "danger" :
                          intent.expectedDecision === "REQUIRES_APPROVAL" ? "amber" : "success"
                        }
                        size="sm"
                      >
                        {intent.expectedDecision === "BLOCKED" ? "Will be blocked" :
                         intent.expectedDecision === "REQUIRES_APPROVAL" ? "Needs approval" : "Auto-approve"}
                      </Badge>
                    </div>
                    <p className="text-xs font-mono text-amber truncate">{intent.text}</p>
                    <p className="text-2xs font-sans text-text-tertiary mt-0.5">{intent.description}</p>
                  </button>
                ))}
              </div>

              <Button
                onClick={handleSubmit}
                loading={submitting}
                className="w-full"
              >
                {submitting ? "Deadhand evaluating..." : "Submit to Deadhand"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Veto */}
        {step === "veto" && vetoedAction && (
          <motion.div
            key="veto"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            <div className="bg-surface-1 border border-border-subtle rounded-card p-4 mb-2">
              <p className="text-xs font-mono text-text-tertiary uppercase tracking-wider mb-1">Step 3 — Veto enforced</p>
              <p className="text-sm font-sans text-text-secondary">
                This operation violated policy. Deadhand issued a hard veto. No override is possible.
              </p>
            </div>
            <VetoCard action={vetoedAction} />
            <Button onClick={() => setStep("kill")} variant="ghost" className="w-full">
              Continue to kill switch demo →
            </Button>
          </motion.div>
        )}

        {/* Approval */}
        {step === "approval" && approvalAction && (
          <motion.div
            key="approval"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            <div className="bg-surface-1 border border-border-subtle rounded-card p-4">
              <p className="text-xs font-mono text-text-tertiary uppercase tracking-wider mb-1">Step 3 — Approval required</p>
              <p className="text-sm font-sans text-text-secondary">
                This operation requires your explicit approval. Deadhand has paused execution pending review.
              </p>
            </div>
            {approvalAction.safetyCard && (
              <SafetyCard card={approvalAction.safetyCard} />
            )}
            <Button onClick={() => setStep("kill")} variant="ghost" className="w-full">
              Continue to kill switch demo →
            </Button>
          </motion.div>
        )}

        {/* Kill switch */}
        {step === "kill" && (
          <motion.div
            key="kill"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            <div className="bg-surface-1 border border-border-subtle rounded-card p-5">
              <p className="text-xs font-mono text-text-tertiary uppercase tracking-wider mb-3">Step 4 — Kill switch</p>
              <p className="text-sm font-sans text-text-secondary mb-4 leading-relaxed">
                In an emergency, the kill switch halts all Deadhand operations instantly.
                No pending executions proceed. All active policies are suspended.
                The kill switch in the top bar fires a real API call.
              </p>

              {demoWalletStatus ? (
                <div className="bg-surface-2 border border-border-subtle rounded-card p-4">
                  <p className="text-xs font-mono text-text-tertiary mb-2">Demo wallet status</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-text-tertiary">Configured</span>
                      <span className={demoWalletStatus.configured ? "text-success" : "text-danger"}>
                        {demoWalletStatus.configured ? "Yes" : "No"}
                      </span>
                    </div>
                    {demoWalletStatus.address && (
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-text-tertiary">Address</span>
                        <span className="text-text-secondary">
                          {demoWalletStatus.address.slice(0, 8)}…{demoWalletStatus.address.slice(-6)}
                        </span>
                      </div>
                    )}
                    {demoWalletStatus.balanceBnb && (
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-text-tertiary">Balance</span>
                        <span className="text-text-secondary">{demoWalletStatus.balanceBnb} BNB</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <Button variant="secondary" size="sm" onClick={checkDemoWallet} className="mb-4">
                  <Zap size={12} /> Check demo wallet
                </Button>
              )}

              <div className="mt-4 p-3 bg-amber/8 border border-amber/20 rounded-card">
                <p className="text-xs font-sans text-amber leading-relaxed">
                  Use the kill switch button (⏻) in the top navigation bar to test the emergency halt.
                  It will pause all policies and cancel active tasks in real time.
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-border-subtle">
                <p className="text-xs font-mono text-text-tertiary mb-2">Demo complete</p>
                <p className="text-sm font-sans text-text-secondary mb-3">
                  You've seen the core Deadhand trust surfaces. Every operation flows through
                  policy enforcement — AI interprets goals, Deadhand decides, you sign.
                </p>
                <Button onClick={reset} variant="secondary" size="sm">
                  <RotateCcw size={12} /> Run demo again
                </Button>
              </div>
            </div>

            {submitting && (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
