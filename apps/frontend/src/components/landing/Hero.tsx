import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { landingHeroReveal, landingHeroItem } from "@/lib/motion";
import { TopologyField } from "@/components/graphics/TopologyField";
import { WalletConnect } from "@/components/wallet/WalletConnect";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  // Subtle parallax on topology background — moves slower than scroll
  const topologyY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 0.5], ["0%", "-12%"]);

  return (
    // taste-skill: min-h-[100dvh] not h-screen for iOS Safari
    <section
      ref={containerRef}
      className="relative min-h-[100dvh] flex flex-col overflow-hidden"
    >
      {/* Background layers */}
      <motion.div
        style={{ y: topologyY }}
        className="absolute inset-0 pointer-events-none"
      >
        <TopologyField nodeCount={40} opacity={0.12} color="mixed" />
      </motion.div>

      {/* Grid pattern */}
      <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />

      {/* Amber radial — subtle brand warmth at center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 45%, rgba(212,168,67,0.035) 0%, transparent 65%)",
        }}
      />

      {/* Bottom fade to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-bg to-transparent pointer-events-none z-10" />

      {/* Content — left-aligned asymmetric per high-end-visual-design */}
      <motion.div
        style={{ opacity: contentOpacity, y: contentY }}
        className="relative z-10 flex flex-col justify-center flex-1 px-6 max-w-7xl mx-auto w-full"
      >
        <motion.div
          variants={landingHeroReveal}
          initial="initial"
          animate="animate"
          className="max-w-3xl pt-24 pb-16 lg:pt-32"
        >
          {/* Eyebrow tag */}
          <motion.div variants={landingHeroItem} className="mb-7">
            <span className="eyebrow">
              <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse_amber inline-block" />
              Non-custodial · BNB Chain · Policy engine
            </span>
          </motion.div>

          {/* Main headline — Barlow Semi Condensed makes this feel authoritative */}
          <motion.h1
            variants={landingHeroItem}
            className="font-display text-[clamp(3rem,8vw,6.5rem)] font-bold leading-[0.95] tracking-tight text-text-primary mb-6"
          >
            AI should plan.
            <br />
            <span className="shimmer-text">Not decide.</span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            variants={landingHeroItem}
            className="text-base sm:text-lg text-text-secondary font-sans max-w-xl leading-relaxed mb-5"
          >
            Deadhand enforces your policy on every AI-proposed action — before
            any execution reaches your wallet. Hard vetoes. Auditable decisions.
            Nothing moves without your rules.
          </motion.p>

          {/* Trust chain */}
          <motion.div
            variants={landingHeroItem}
            className="flex items-center gap-2.5 mb-10 flex-wrap"
          >
            {[
              { label: "AI interprets", color: "text-amber" },
              { label: "·", color: "text-border-medium" },
              { label: "Deadhand decides", color: "text-text-secondary" },
              { label: "·", color: "text-border-medium" },
              { label: "You sign", color: "text-steel-bright" },
            ].map((item, i) => (
              <span key={i} className={`text-sm font-mono ${item.color}`}>
                {item.label}
              </span>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            variants={landingHeroItem}
            className="flex items-center gap-3 flex-wrap"
          >
            <WalletConnect size="lg" variant="primary" />
            <Link
              to="/app/demo"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-sans font-medium text-text-secondary border border-border-medium rounded-btn hover:text-text-primary hover:border-border-medium transition-[border-color,color] duration-150"
            >
              See it in action <ArrowRight size={13} />
            </Link>
          </motion.div>
        </motion.div>

        {/* Stat row */}
        <motion.div
          variants={landingHeroReveal}
          initial="initial"
          animate="animate"
          className="pb-16 lg:pb-24"
        >
          <div className="flex items-center gap-6 flex-wrap">
            {[
              { label: "Every action evaluated", value: "Policy-first" },
              { label: "Blocked actions logged", value: "Full audit trail" },
              { label: "No keys ever held", value: "Non-custodial" },
            ].map(({ label, value }) => (
              <motion.div
                key={label}
                variants={landingHeroItem}
                className="flex items-center gap-2"
              >
                <ShieldCheck size={12} className="text-amber shrink-0" />
                <span className="text-xs font-mono text-text-tertiary">{value}</span>
                <span className="text-border-subtle text-xs">·</span>
                <span className="text-xs font-sans text-text-tertiary">{label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
