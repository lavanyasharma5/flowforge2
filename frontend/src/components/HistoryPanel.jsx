/**
 * HistoryPanel.jsx — Workflow run history
 * NEW FEATURE: Shows all past workflow runs with stats.
 * Copilot has no runtime persistence — cannot do this.
 */

const STATUS_STYLE = {
  success:    { cls: "bg-emerald-100 text-emerald-700", icon: "check_circle",  label: "Success"     },
  failed:     { cls: "bg-red-100 text-red-700",         icon: "error",         label: "Failed"      },
  rejected:   { cls: "bg-orange-100 text-orange-700",   icon: "block",         label: "Rejected"    },
  rolled_back:{ cls: "bg-purple-100 text-purple-700",   icon: "undo",          label: "Rolled Back" },
};

function RunCard({ run }) {
  const style = STATUS_STYLE[run.overall_status] || STATUS_STYLE.success;
  const date = new Date(run.started_at);
  const elapsed = (() => {
    const end = new Date(run.last_updated);
    const ms = end - date;
    if (ms < 1000) return "<1s";
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  })();

  const sc = run.status_counts || {};
  const total = Object.values(sc).reduce((a, b) => a + b, 0);

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-slate-300 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${style.cls}`}>
              <span className="material-symbols-outlined text-xs">{style.icon}</span>
              {style.label}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{run.run_id.slice(0, 8)}…</span>
          </div>
          <p className="text-sm font-semibold text-slate-800 truncate">{run.first_task_name}</p>
          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">schedule</span>
              {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span>•</span>
            <span>{elapsed} duration</span>
            <span>•</span>
            <span>{total} events</span>
          </div>
        </div>
      </div>

      {/* Status breakdown bar */}
      <div className="mt-3 flex gap-3 text-[11px]">
        {sc.success > 0    && <span className="text-emerald-600 font-semibold">✓ {sc.success}</span>}
        {sc.rejected > 0   && <span className="text-orange-600 font-semibold">⊘ {sc.rejected}</span>}
        {sc.failed > 0     && <span className="text-red-600 font-semibold">✗ {sc.failed}</span>}
        {sc.rolled_back > 0 && <span className="text-purple-600 font-semibold">↩ {sc.rolled_back}</span>}
        {sc.allowed > 0    && <span className="text-slate-400">{sc.allowed} validated</span>}
      </div>
    </div>
  );
}

export default function HistoryPanel({ history, onRefresh }) {
  if (!history.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 bg-white">
        <span className="material-symbols-outlined text-5xl text-slate-200">history</span>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-600 mb-1">No run history yet</p>
          <p className="text-xs text-slate-400">Past workflow runs are persisted in SQLite and appear here.</p>
        </div>
        <button onClick={onRefresh} className="flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors">
          <span className="material-symbols-outlined text-sm">refresh</span>
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f8f9fa]">
      <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-slate-600">history</span>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-700">Run History</span>
          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{history.length} runs</span>
        </div>
        <button onClick={onRefresh} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          <span className="material-symbols-outlined text-sm">refresh</span>
          Refresh
        </button>
      </div>
      <div className="p-4 space-y-3 max-w-3xl">
        {history.map((run) => (
          <RunCard key={run.run_id} run={run} />
        ))}
      </div>
    </div>
  );
}
