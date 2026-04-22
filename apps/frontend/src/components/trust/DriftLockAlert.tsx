import { motion } from "framer-motion";
import { Lock, AlertTriangle } from "lucide-react";
import { driftShake } from "@/lib/motion";

interface DriftLockAlertProps {
  explanation?: string;
}

export function DriftLockAlert({ explanation }: DriftLockAlertProps) {
  return (
    <motion.div
      variants={driftShake}
      initial="initial"
      animate="animate"
      className="rounded-card border border-amber/40 bg-amber/8 p-3 flex items-start gap-3"
    >
      <div className="w-7 h-7 rounded bg-amber/20 border border-amber/30 flex items-center justify-center shrink-0">
        <Lock size={13} className="text-amber" />
      </div>
      <div>
        <p className="text-sm font-semibold text-amber font-display">Execution envelope changed. Action blocked.</p>
        {explanation ? (
          <p className="text-xs text-text-secondary font-sans mt-1">{explanation}</p>
        ) : (
          <p className="text-xs text-text-secondary font-sans mt-1">
            The final execution call differed materially from what was approved. Deadhand blocked the execution.
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-2 text-2xs font-mono text-amber/70">
          <AlertTriangle size={11} /> EXECUTION_DRIFT_BLOCKED
        </div>
      </div>
    </motion.div>
  );
}
