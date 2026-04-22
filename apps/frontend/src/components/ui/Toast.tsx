import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { useUIStore, type Toast } from "@/store/uiStore";

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: "border-success/30 bg-success/10 text-success-bright",
  error: "border-danger/30 bg-danger/10 text-danger-bright",
  warning: "border-amber/30 bg-amber/10 text-amber",
  info: "border-steel/30 bg-steel/10 text-steel-bright",
};

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useUIStore();
  const Icon = icons[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-card border shadow-elevated max-w-sm",
        "bg-surface-2",
        styles[toast.type]
      )}
    >
      <Icon size={14} className="mt-0.5 shrink-0" />
      <p className="text-xs font-sans text-text-primary flex-1">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="text-text-tertiary hover:text-text-primary transition-colors ml-1 shrink-0"
      >
        <X size={12} />
      </button>
    </motion.div>
  );
}

export function ToastContainer() {
  const { toasts } = useUIStore();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
