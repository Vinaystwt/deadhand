import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatBnb(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  if (num === 0) return "0 BNB";
  if (num < 0.001) return `<0.001 BNB`;
  return `${num.toFixed(4).replace(/\.?0+$/, "")} BNB`;
}

export function formatTimestamp(ts: string | Date): string {
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatTimeAgo(ts: string | Date): string {
  const now = Date.now();
  const then = new Date(ts).getTime();
  const diff = now - then;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export function severityColor(severity: string): string {
  switch (severity) {
    case "CRITICAL": return "text-danger";
    case "HIGH": return "text-danger-bright";
    case "WARNING": return "text-amber";
    case "INFO": return "text-steel-bright";
    default: return "text-text-secondary";
  }
}

export function decisionColor(decision: string): string {
  switch (decision) {
    case "BLOCKED": return "text-danger";
    case "REQUIRES_APPROVAL": return "text-amber";
    case "AUTO_APPROVED": return "text-success";
    default: return "text-text-secondary";
  }
}

export function storyClassIcon(storyClass: string): string {
  switch (storyClass) {
    case "GOAL": return "Target";
    case "INTENT": return "Brain";
    case "ACTION_PLAN": return "ListChecks";
    case "DEADHAND_VETO": return "ShieldX";
    case "POLICY_VETO": return "ShieldX";
    case "APPROVAL_GATE": return "ShieldAlert";
    case "SIMULATION": return "FlaskConical";
    case "EXECUTION_GUARD": return "Lock";
    case "EXECUTION_RESULT": return "CheckCircle";
    case "EMERGENCY_STOP": return "AlertOctagon";
    case "POLICY_COMPILER": return "Code2";
    case "AUDIT_EXPORT": return "Download";
    default: return "Circle";
  }
}

export function taskStatusLabel(status: string): string {
  switch (status) {
    case "PENDING": return "Planning...";
    case "NEEDS_CLARIFICATION": return "Clarification needed";
    case "ACTIVE": return "Active";
    case "COMPLETED": return "Completed";
    case "CANCELLED": return "Cancelled";
    case "FAILED": return "Failed";
    default: return status;
  }
}

export function actionStatusLabel(status: string): string {
  switch (status) {
    case "PENDING": return "Pending review";
    case "APPROVED": return "Approved";
    case "REJECTED": return "Rejected";
    case "READY_TO_EXECUTE": return "Ready";
    case "EXECUTING": return "Executing...";
    case "EXECUTED": return "Executed";
    case "FAILED": return "Failed";
    case "CANCELLED": return "Cancelled";
    default: return status;
  }
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
