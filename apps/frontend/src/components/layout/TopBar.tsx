import { Link } from "react-router-dom";
import { WalletStatus } from "@/components/wallet/WalletStatus";
import { KillSwitch } from "@/components/emergency/KillSwitch";
import { useEmergencyStore } from "@/store/emergencyStore";
import { emergencyApi } from "@/api/emergency";
import { useToast } from "@/store/uiStore";
import { getErrorMessage } from "@/api/client";
import { cn } from "@/lib/utils";

interface TopBarProps {
  className?: string;
}

export function TopBar({ className }: TopBarProps) {
  const { setStopped, stopped } = useEmergencyStore();
  const toast = useToast();

  async function handleStop() {
    try {
      await emergencyApi.stop();
      setStopped(true);
      toast.warning("Deadhand halted. All operations suspended.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <header
      className={cn(
        "h-12 flex items-center justify-between px-4 border-b border-border-subtle shrink-0",
        "bg-surface-1/90 backdrop-filter backdrop-blur-md",
        className
      )}
      style={{ boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.03)" }}
    >
      {/* Logo */}
      <Link
        to="/app"
        className="flex items-center gap-2 group"
      >
        <div className="w-5 h-5 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 transition-transform duration-150 group-hover:scale-110">
            {/* Outer hexagon */}
            <polygon
              points="12,2 20.5,7 20.5,17 12,22 3.5,17 3.5,7"
              stroke="#D4A843"
              strokeWidth="1.2"
              fill="rgba(212,168,67,0.07)"
              strokeLinejoin="round"
            />
            {/* Inner hexagon rotated 30° */}
            <polygon
              points="16.4,12 14.2,15.8 9.8,15.8 7.6,12 9.8,8.2 14.2,8.2"
              stroke="#D4A843"
              strokeWidth="0.7"
              fill="rgba(212,168,67,0.13)"
              strokeLinejoin="round"
              opacity="0.7"
            />
            {/* Center node */}
            <circle cx="12" cy="12" r="1.8" fill="#D4A843" />
          </svg>
        </div>
        <span className="text-sm font-bold font-display tracking-wide text-text-primary group-hover:text-amber transition-colors duration-150">
          Deadhand
        </span>
      </Link>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {stopped && (
          <span className="text-2xs font-mono text-amber bg-amber/8 border border-amber/25 px-2 py-0.5 rounded-badge animate-pulse_amber">
            HALTED
          </span>
        )}
        <KillSwitch onStop={handleStop} />
        <WalletStatus />
      </div>
    </header>
  );
}
