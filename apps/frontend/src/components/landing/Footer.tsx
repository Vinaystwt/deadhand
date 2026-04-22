import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { WalletConnect } from "@/components/wallet/WalletConnect";

export function Footer() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <footer ref={ref} className="border-t border-border-subtle">
      {/* CTA section */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-8"
          >
            <div>
              <p className="eyebrow mb-4">Start protected</p>
              <h2 className="font-display text-[clamp(1.75rem,4vw,3rem)] font-bold text-text-primary leading-[1.1] tracking-tight max-w-md">
                Execute with full confidence.
              </h2>
              <p className="text-text-secondary font-sans mt-3 max-w-sm text-sm leading-relaxed">
                Connect your wallet. Set your policy. Let AI plan. Let Deadhand block everything that shouldn't move.
              </p>
            </div>
            <div className="shrink-0">
              <WalletConnect size="lg" variant="primary" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Bottom bar */}
      <div className="border-t border-border-subtle px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <polygon
                points="12,2 22,7 22,17 12,22 2,17 2,7"
                stroke="#D4A843"
                strokeWidth="1.5"
                fill="rgba(212,168,67,0.08)"
              />
            </svg>
            <span className="text-xs font-display font-semibold text-text-secondary tracking-wide">
              Deadhand
            </span>
          </div>
          <p className="text-2xs text-text-tertiary font-mono">
            AI interprets · Deadhand decides · You sign
          </p>
        </div>
      </div>
    </footer>
  );
}
