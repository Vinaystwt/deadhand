import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ShieldX, ShieldAlert, Code2, Lock, Clock, AlertOctagon } from "lucide-react";
import { scrollRevealStagger, scrollReveal } from "@/lib/motion";

const features = [
  {
    icon: ShieldX,
    title: "Veto Engine",
    desc: "Hard blocks return structured denial receipts — exact violated rule, reason code, severity, and safe alternative. Not a soft warning.",
    tag: "CORE",
    color: "danger",
    accentBg: "rgba(192, 57, 43, 0.06)",
    accentBorder: "rgba(192, 57, 43, 0.18)",
  },
  {
    icon: ShieldAlert,
    title: "Safety Card",
    desc: "Every action shows blast radius before approval — estimated spend, value at risk, contracts touched, simulation result.",
    tag: "SAFETY",
    color: "amber",
    accentBg: "rgba(212, 168, 67, 0.07)",
    accentBorder: "rgba(212, 168, 67, 0.22)",
  },
  {
    icon: Code2,
    title: "Policy Compiler",
    desc: "Natural language intent compiled to an enforceable receipt. AI interprets once. Deadhand enforces forever. The receipt is the proof.",
    tag: "TRUST",
    color: "amber",
    accentBg: "rgba(212, 168, 67, 0.07)",
    accentBorder: "rgba(212, 168, 67, 0.22)",
  },
  {
    icon: Lock,
    title: "Drift Lock",
    desc: "The execution envelope is verified against the approved intent immediately before broadcast. Any material deviation is blocked at the guard.",
    tag: "GUARD",
    color: "steel",
    accentBg: "rgba(107, 127, 163, 0.07)",
    accentBorder: "rgba(107, 127, 163, 0.18)",
  },
  {
    icon: Clock,
    title: "Audit Story",
    desc: "Every task replays as a structured decision trail. Goal → intent → veto/approval → guard → execution result. JSON and Markdown export.",
    tag: "AUDIT",
    color: "steel",
    accentBg: "rgba(107, 127, 163, 0.07)",
    accentBorder: "rgba(107, 127, 163, 0.18)",
  },
  {
    icon: AlertOctagon,
    title: "Emergency Kill Switch",
    desc: "Global halt cancels every pending operation instantly. Resumable when ready. Every event is durably logged with timestamp and context.",
    tag: "CONTROL",
    color: "danger",
    accentBg: "rgba(192, 57, 43, 0.06)",
    accentBorder: "rgba(192, 57, 43, 0.18)",
  },
];

const tagColors = {
  danger: "text-danger-bright bg-danger/8 border-danger/20",
  amber: "text-amber bg-amber/8 border-amber/20",
  steel: "text-steel-bright bg-steel/8 border-steel/20",
};

const iconColors = {
  danger: "text-danger-bright",
  amber: "text-amber",
  steel: "text-steel-bright",
};

export function FeatureShowcase() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="py-28 px-6 border-t border-border-subtle">
      <div className="max-w-5xl mx-auto">
        {/* Section header — left-aligned */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mb-14"
        >
          <p className="eyebrow mb-4">Safety surfaces</p>
          <h2 className="font-display text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-text-primary leading-[1.1] tracking-tight">
            Trust infrastructure.
            <br />
            Not a trading bot.
          </h2>
        </motion.div>

        {/* Feature grid — double-bezel card treatment */}
        <motion.div
          variants={scrollRevealStagger}
          initial="initial"
          animate={inView ? "animate" : "initial"}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            const tagClass = tagColors[feature.color as keyof typeof tagColors];
            const iconClass = iconColors[feature.color as keyof typeof iconColors];

            return (
              <motion.div
                key={feature.title}
                variants={scrollReveal}
                className="group"
              >
                {/* Double-bezel outer shell */}
                <div
                  className="rounded-[10px] p-[1.5px] transition-all duration-200"
                  style={{
                    background: `rgba(255,255,255,0.03)`,
                    border: `1px solid rgba(255,255,255,0.05)`,
                  }}
                >
                  {/* Inner core */}
                  <div
                    className="rounded-card p-5 h-full transition-all duration-200 group-hover:brightness-110"
                    style={{
                      background: `radial-gradient(ellipse 120% 80% at 50% 0%, ${feature.accentBg} 0%, transparent 70%), #111113`,
                      border: `1px solid transparent`,
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget.parentElement as HTMLElement).style.borderColor = feature.accentBorder;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget.parentElement as HTMLElement).style.borderColor = "rgba(255,255,255,0.05)";
                    }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <Icon size={18} className={iconClass} />
                      <span className={`text-2xs font-mono border rounded-badge px-1.5 py-0.5 ${tagClass}`}>
                        {feature.tag}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold font-display text-text-primary mb-2 tracking-tight">
                      {feature.title}
                    </h3>
                    <p className="text-xs text-text-secondary font-sans leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
