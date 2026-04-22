import { motion, AnimatePresence } from "framer-motion";
import { AlertOctagon, Play } from "lucide-react";
import { bannerDrop } from "@/lib/motion";
import { Button } from "@/components/ui/Button";
import { useEmergencyStore } from "@/store/emergencyStore";
import { formatTimestamp } from "@/lib/utils";

interface EmergencyBannerProps {
  onResume: () => Promise<void>;
  resuming?: boolean;
}

export function EmergencyBanner({ onResume, resuming }: EmergencyBannerProps) {
  const { stopped, stoppedAt } = useEmergencyStore();

  return (
    <AnimatePresence>
      {stopped && (
        <motion.div
          variants={bannerDrop}
          initial="initial"
          animate="animate"
          exit="exit"
          className="w-full bg-amber/12 border-b border-amber/30 px-4 py-2.5 flex items-center gap-3 z-40"
        >
          <AlertOctagon size={15} className="text-amber shrink-0 animate-pulse_amber" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-amber font-display">
              Deadhand halted.{" "}
            </span>
            <span className="text-xs text-text-secondary font-sans">
              All operations suspended.
              {stoppedAt && ` · ${formatTimestamp(stoppedAt)}`}
            </span>
          </div>
          <Button variant="amber" size="sm" onClick={onResume} loading={resuming}>
            <Play size={12} /> Resume Operations
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
