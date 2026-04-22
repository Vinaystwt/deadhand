import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertOctagon, AlertTriangle } from "lucide-react";
import { killSwitchFlash } from "@/lib/motion";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useEmergencyStore } from "@/store/emergencyStore";

interface KillSwitchProps {
  onStop: () => Promise<void>;
}

export function KillSwitch({ onStop }: KillSwitchProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [flash, setFlash] = useState(false);
  const { stopped } = useEmergencyStore();

  async function handleConfirm() {
    setStopping(true);
    try {
      setFlash(true);
      await onStop();
      setTimeout(() => setFlash(false), 600);
    } finally {
      setStopping(false);
      setDialogOpen(false);
    }
  }

  if (stopped) return null;

  return (
    <>
      {/* Full-screen flash overlay */}
      <AnimatePresence>
        {flash && (
          <motion.div
            variants={killSwitchFlash}
            initial="initial"
            animate="animate"
            className="fixed inset-0 bg-amber/30 z-[200] pointer-events-none"
          />
        )}
      </AnimatePresence>

      <button
        onClick={() => setDialogOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn border border-danger/30 text-danger hover:text-danger-bright hover:bg-danger/10 hover:border-danger/50 transition-[background-color,border-color,color] duration-150 active:scale-[0.97] text-xs font-sans font-medium"
      >
        <AlertOctagon size={13} />
        Emergency Stop
      </button>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Emergency Stop"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-danger/8 border border-danger/25 rounded-card p-3">
            <AlertTriangle size={15} className="text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-danger-bright font-display">Halt all operations.</p>
              <p className="text-xs text-text-secondary font-sans mt-1">
                This will immediately pause all active policies, cancel all pending actions, and prevent any further execution until you manually resume.
              </p>
            </div>
          </div>
          <p className="text-xs text-text-tertiary font-sans">
            This action cannot be undone automatically. You will need to resume manually.
          </p>
          <div className="flex gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirm}
              loading={stopping}
              className="flex-1"
            >
              <AlertOctagon size={13} /> Halt Deadhand
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDialogOpen(false)}
              disabled={stopping}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
