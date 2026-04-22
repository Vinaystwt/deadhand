import { useState } from "react";
import { Wallet, LogOut, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/store/uiStore";
import { authApi } from "@/api/auth";
import { truncateAddress } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function WalletStatus() {
  const { walletAddress, clear } = useAuthStore();
  const [open, setOpen] = useState(false);
  const toast = useToast();

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    clear();
    toast.info("Disconnected.");
    setOpen(false);
  }

  if (!walletAddress) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-btn border border-border-subtle bg-surface-2 hover:bg-surface-3 transition-colors text-xs font-sans text-text-secondary hover:text-text-primary"
      >
        <Wallet size={12} className="text-amber" />
        {truncateAddress(walletAddress)}
        <ChevronDown size={11} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 2, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full mt-1.5 z-20 bg-surface-2 border border-border-subtle rounded-card shadow-elevated min-w-[160px]"
            >
              <div className="p-2">
                <p className="text-2xs text-text-tertiary font-mono px-2 py-1 truncate max-w-[160px]">
                  {walletAddress}
                </p>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-text-secondary hover:text-danger-bright hover:bg-danger/8 transition-colors font-sans"
                >
                  <LogOut size={12} /> Disconnect
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
