import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Brain, Shield, Wallet, ArrowRight } from "lucide-react";

const nodes = [
  {
    icon: Brain,
    step: "01",
    label: "AI interprets",
    sublabel: "Parses your goal into candidate actions. Explains risk in plain language. Proposes but never executes.",
    borderColor: "border-steel/25",
    bgColor: "bg-steel/6",
    iconBg: "bg-steel/10 border-steel/25",
    iconColor: "text-steel-bright",
    stepColor: "text-steel",
    accent: "rgba(107, 127, 163, 0.08)",
  },
  {
    icon: Shield,
    step: "02",
    label: "Deadhand decides",
    sublabel: "Deterministic policy engine. Hard vetoes. Approval gates. Drift detection. No AI in the decision path.",
    borderColor: "border-amber/35",
    bgColor: "bg-amber/6",
    iconBg: "bg-amber/12 border-amber/30",
    iconColor: "text-amber",
    stepColor: "text-amber",
    accent: "rgba(212, 168, 67, 0.10)",
    isCenter: true,
  },
  {
    icon: Wallet,
    step: "03",
    label: "You sign",
    sublabel: "Non-custodial execution. Only approved actions reach the signing layer. Your keys never leave your device.",
    borderColor: "border-success/20",
    bgColor: "bg-success/5",
    iconBg: "bg-success/8 border-success/20",
    iconColor: "text-success",
    stepColor: "text-success",
    accent: "rgba(39, 174, 96, 0.07)",
  },
];

export function TrustModel() {
  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section ref={sectionRef} className="py-28 px-6 border-t border-border-subtle relative">
      {/* Section header */}
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16"
        >
          <p className="eyebrow mb-4">Trust architecture</p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <h2 className="font-display text-[clamp(1.75rem,4vw,3rem)] font-bold text-text-primary leading-[1.1] tracking-tight max-w-lg">
              The trust model is the product.
            </h2>
            <p className="text-sm text-text-secondary font-sans max-w-sm leading-relaxed">
              Three layers with strict role separation. None can impersonate the others. The AI is never the authority.
            </p>
          </div>
        </motion.div>

        {/* Node cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border-subtle rounded-card overflow-hidden">
          {nodes.map((node, i) => {
            const Icon = node.icon;
            return (
              <motion.div
                key={node.label}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: 0.5,
                  delay: i * 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={`relative ${node.bgColor} bg-surface-1 p-7`}
                style={{
                  background: `radial-gradient(ellipse 120% 80% at 50% 0%, ${node.accent} 0%, transparent 60%), #111113`,
                }}
              >
                {/* Step + icon row */}
                <div className="flex items-start justify-between mb-5">
                  <span className={`text-xs font-mono ${node.stepColor} opacity-60`}>
                    {node.step}
                  </span>
                  <div
                    className={`w-9 h-9 rounded-card border ${node.iconBg} flex items-center justify-center`}
                  >
                    <Icon size={16} className={node.iconColor} />
                  </div>
                </div>

                <p className={`text-base font-bold font-display mb-2 ${node.iconColor}`}>
                  {node.label}
                </p>
                <p className="text-xs text-text-secondary font-sans leading-relaxed">
                  {node.sublabel}
                </p>

                {/* Arrow connector (between cards, not on last) */}
                {i < nodes.length - 1 && (
                  <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-surface-2 border border-border-subtle items-center justify-center">
                    <ArrowRight size={10} className="text-text-tertiary" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Bottom footnote */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="text-center text-xs font-mono text-text-tertiary mt-6"
        >
          AI interpreted · Deadhand enforced · You retained control
        </motion.p>
      </div>
    </section>
  );
}
