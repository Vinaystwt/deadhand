import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { ReplayTimeline } from "@/components/replay/ReplayTimeline";
import { ExportPanel } from "@/components/replay/ExportPanel";
import { useReplay } from "@/hooks/useReplay";
import { useTasks } from "@/hooks/useTask";

export function ReplayPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTaskId = searchParams.get("task") ?? "";
  const [taskId, setTaskId] = useState(initialTaskId);
  const [inputId, setInputId] = useState(initialTaskId);

  const { data: tasks } = useTasks();
  const { data: story, isLoading } = useReplay(taskId);

  useEffect(() => {
    if (taskId) {
      setSearchParams({ task: taskId }, { replace: true });
    }
  }, [taskId, setSearchParams]);

  const completedTasks = tasks?.filter(
    (t) => t.status === "COMPLETED" || t.status === "FAILED" || t.status === "CANCELLED"
  ) ?? [];

  function handleSearch() {
    if (inputId.trim()) setTaskId(inputId.trim());
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader
        title="Replay"
        description="Reconstruct the full decision trail for any operation"
      />

      {/* Task selector */}
      <div className="bg-surface-1 border border-border-subtle rounded-card p-4 mb-6">
        <p className="text-xs font-mono text-text-tertiary uppercase tracking-wider mb-3">Select operation</p>

        {completedTasks.length > 0 ? (
          <div className="space-y-1.5 mb-3">
            {completedTasks.slice(0, 8).map((t) => (
              <button
                key={t.id}
                onClick={() => { setTaskId(t.id); setInputId(t.id); }}
                className={[
                  "w-full text-left px-3 py-2 rounded border transition-colors text-xs font-sans",
                  taskId === t.id
                    ? "border-amber/40 bg-amber/8 text-text-primary"
                    : "border-border-subtle bg-surface-2/50 text-text-secondary hover:border-border-medium",
                ].join(" ")}
              >
                <span className="font-mono text-text-tertiary mr-2">{t.id.slice(0, 8)}</span>
                {t.naturalLanguageGoal}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex gap-2">
          <Input
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Paste task ID..."
            className="font-mono text-xs"
          />
          <button
            onClick={handleSearch}
            className="px-3 py-2 bg-surface-2 border border-border-subtle rounded text-text-tertiary hover:text-text-primary hover:border-border-medium transition-colors"
          >
            <Search size={13} />
          </button>
        </div>
      </div>

      {taskId && (
        <>
          <ReplayTimeline story={story ?? null} loading={isLoading} />
          {story && !isLoading && (
            <div className="mt-4">
              <ExportPanel taskId={taskId} />
            </div>
          )}
        </>
      )}

      {!taskId && (
        <div className="text-center py-16 bg-surface-1 border border-border-subtle rounded-card">
          <p className="text-text-tertiary font-sans text-sm">Select an operation above to view its audit story.</p>
        </div>
      )}
    </div>
  );
}
