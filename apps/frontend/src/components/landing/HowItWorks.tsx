import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const steps = [
  {
    n: "01",
    title: "Set your policy",
    body: "Define spending limits, approval thresholds, allowed actions. Write plain English or use a preset. Deadhand compiles it to an enforceable artifact.",
  },
  {
    n: "02",
    title: "Describe your goal",
    body: "Tell Deadhand what you want to achieve. The AI parses intent into candidate actions — it proposes, explains, and flags risk.",
  },
  {
    n: "03",
    title: "Deadhand evaluates",
    body: "Every proposed action is evaluated against your compiled policy. Violations are hard-blocked. Borderline actions are routed for your approval.",
  },
  {
    n: "04",
    title: "Review what needs review",
    body: "Approved operations show you a safety card — blast radius, simulation status, contracts touched. You decide with full context.",
  },
  {
    n: "05",
    title: "Execution guard fires",
    body: "Before any transaction broadcasts, the final envelope is checked against the approved intent. Drift from approval is blocked at the last gate.",
  },
  {
    n: "06",
    title: "Full audit trail",
    body: "Every task generates a replay story — goal to execution, with every decision, veto, and approval logged. Exportable as JSON or Markdown.",
  },
];

export function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="py-28 px-6 border-t border-border-subtle">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mb-14"
        >
          <p className="eyebrow mb-4">How it works</p>
          <h2 className="font-display text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-text-primary leading-[1.1] tracking-tight">
            Every operation. Every gate. Every proof.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border-subtle">
          {steps.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              className="bg-bg p-6 relative group"
            >
              {/* Hover amber tint */}
              <div className="absolute inset-0 bg-amber/[0.018] opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

              <span className="block text-[2.5rem] font-display font-bold text-border-subtle leading-none mb-4 select-none">
                {step.n}
              </span>
              <h3 className="text-sm font-bold font-display text-text-primary mb-2 tracking-tight">
                {step.title}
              </h3>
              <p className="text-xs text-text-secondary font-sans leading-relaxed">
                {step.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
