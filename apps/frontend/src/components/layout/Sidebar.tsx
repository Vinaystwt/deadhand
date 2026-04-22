import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Shield,
  ClipboardList,
  Clock,
  BookOpen,
  PlayCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/policies", label: "Policies", icon: Shield },
  { to: "/app/tasks", label: "Operations", icon: ClipboardList },
  { to: "/app/replay", label: "Replay", icon: Clock },
  { to: "/app/audit", label: "Audit Log", icon: BookOpen },
  { to: "/app/demo", label: "Demo", icon: PlayCircle },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "w-52 shrink-0 border-r border-border-subtle bg-surface-1 flex flex-col",
        className
      )}
    >
      <nav className="flex-1 p-2 pt-3 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-btn text-xs font-sans font-medium",
                // Emil rule: nav is high-frequency — no animation, instant state change
                isActive
                  ? "bg-amber/10 text-amber border border-amber/18 shadow-[inset_0_1px_0_rgba(212,168,67,0.08)]"
                  : "text-text-tertiary hover:text-text-secondary hover:bg-surface-2/70 border border-transparent"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={13}
                  className={isActive ? "text-amber" : "text-text-tertiary"}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* BNB network indicator */}
      <div className="p-3 border-t border-border-subtle">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse_amber" />
          <p className="text-2xs text-text-tertiary font-mono">BNB Testnet · 97</p>
        </div>
      </div>
    </aside>
  );
}
