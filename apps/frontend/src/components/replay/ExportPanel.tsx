import { useState } from "react";
import { Download, FileJson, FileText, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { taskApi } from "@/api/task";
import { useToast } from "@/store/uiStore";
import { getErrorMessage } from "@/api/client";
import { downloadJson, downloadMarkdown } from "@/lib/utils";

interface ExportPanelProps {
  taskId: string;
}

export function ExportPanel({ taskId }: ExportPanelProps) {
  const [loadingJson, setLoadingJson] = useState(false);
  const [loadingMd, setLoadingMd] = useState(false);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  async function handleJsonExport() {
    setLoadingJson(true);
    try {
      const story = await taskApi.exportJson(taskId);
      downloadJson(story, `deadhand-audit-${taskId.slice(0, 8)}.json`);
      toast.success("JSON exported.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingJson(false);
    }
  }

  async function handleMarkdownExport() {
    setLoadingMd(true);
    try {
      const md = await taskApi.exportMarkdown(taskId);
      downloadMarkdown(md, `deadhand-audit-${taskId.slice(0, 8)}.md`);
      toast.success("Markdown exported.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingMd(false);
    }
  }

  async function handleCopyMarkdown() {
    try {
      const md = await taskApi.exportMarkdown(taskId);
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Failed to copy.");
    }
  }

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Download size={14} className="text-amber" />
        <p className="text-sm font-semibold font-display text-text-primary">Export Proof</p>
      </div>
      <p className="text-xs text-text-secondary font-sans mb-4">
        Export this audit story as verifiable JSON or human-readable Markdown.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={handleJsonExport} loading={loadingJson}>
          <FileJson size={13} /> Export JSON
        </Button>
        <Button variant="secondary" size="sm" onClick={handleMarkdownExport} loading={loadingMd}>
          <FileText size={13} /> Export Markdown
        </Button>
        <Button variant="ghost" size="sm" onClick={handleCopyMarkdown}>
          {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy Markdown"}
        </Button>
      </div>
    </div>
  );
}
