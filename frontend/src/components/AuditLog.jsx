import { useState } from "react";

function AuditRow({ entry, index, numEvents }) {
  const [expanded, setExpanded] = useState(false);
  const { event, data, ts } = entry;

  const eventDisplay = {
    workflow_start: { label: "Workflow Started",   color: "bg-tertiary", tool: null },
    workflow_done:  { label: "Workflow Complete",  color: "bg-surface-tint", tool: null },
    task_start:     { label: data.taskName || "Task Started", color: "bg-blue-400", tool: data.tool },
    task_done:      { label: data.taskName || "Task Done",    color: data.success ? "bg-slate-300" : "bg-error", tool: data.tool },
    task_failed:    { label: data.taskName || "Task Failed",  color: "bg-error", tool: null },
    task_rejected:  { label: data.taskName || "Rejected",     color: "bg-orange-500", tool: null },
    error:          { label: "Error",             color: "bg-error", tool: null },
  }[event] || { label: event, color: "bg-slate-200", tool: null };

  const hasDetails = data.reasoning || data.stdout || data.stderr || data.reason || data.error || data.parameters;

  const timeStr = new Date(ts).toLocaleTimeString("en-US", { hour12: false, timeZone: "UTC" }) + " UTC";

  return (
    <div className={`flex gap-3 px-6 py-3 transition-colors hover:bg-surface-container-low hover:cursor-pointer border-b border-surface-container-high ${expanded ? "bg-surface-container-lowest" : ""}`} onClick={() => hasDetails && setExpanded(!expanded)}>
      <div className="flex flex-col items-center">
        <div className={`w-2 h-2 ${eventDisplay.color} rounded-full mt-2 shrink-0`}></div>
        {/* Draw a subtle line if not the last item, though for simplicity we just space it */}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">#{String(index + 1).padStart(2, "0")}</span>
            <p className="text-sm font-bold text-on-surface truncate">{eventDisplay.label}</p>
            {eventDisplay.tool && (
              <span className="text-[9px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-sm border border-slate-200">
                {eventDisplay.tool}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <p className="text-xs font-semibold text-slate-400">{timeStr}</p>
            {hasDetails && (
              <span className={`material-symbols-outlined text-sm text-slate-300 transition-transform ${expanded ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            )}
          </div>
        </div>
        
        {expanded && (
          <div className="mt-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 overflow-x-auto space-y-4 shadow-inner">
            {data.reasoning && (
              <div className="flex flex-col gap-1">
                <span className="font-bold text-tertiary uppercase tracking-wider text-[10px]">AI Reasoning</span>
                <span className="italic text-slate-700 bg-blue-50 p-3 rounded-lg border border-blue-100">{data.reasoning}</span>
              </div>
            )}
            {data.stdout && (
              <div className="flex flex-col gap-1">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">stdout</span>
                <pre className="font-mono text-[11px] text-slate-800 whitespace-pre-wrap bg-white p-3 rounded-lg border border-slate-200">{data.stdout}</pre>
              </div>
            )}
            {data.stderr && (
              <div className="flex flex-col gap-1">
                <span className="font-bold text-error uppercase tracking-wider text-[10px]">stderr</span>
                <pre className="font-mono text-[11px] text-error whitespace-pre-wrap bg-red-50 p-3 rounded-lg border border-red-100">{data.stderr}</pre>
              </div>
            )}
            {data.reason && (
              <div className="flex flex-col gap-1">
                <span className="font-bold text-orange-600 uppercase tracking-wider text-[10px]">Rejection Reason</span>
                <pre className="font-mono text-[11px] text-orange-700 whitespace-pre-wrap bg-orange-50 p-3 rounded-lg border border-orange-100">{data.reason}</pre>
              </div>
            )}
            {data.error && (
              <div className="flex flex-col gap-1">
                <span className="font-bold text-error uppercase tracking-wider text-[10px]">System Error</span>
                <pre className="font-mono text-[11px] text-error whitespace-pre-wrap bg-red-50 p-3 rounded-lg border border-red-100">{data.error}</pre>
              </div>
            )}
            {data.parameters && (
              <div className="flex flex-col gap-1">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Tool Parameters</span>
                <pre className="font-mono text-[11px] text-slate-600 whitespace-pre-wrap bg-white p-3 rounded-lg border border-slate-200">{JSON.stringify(data.parameters, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuditLog({ auditEvents }) {
  if (!auditEvents.length) {
    return (
      <div className="flex-1 bg-background relative overflow-hidden flex flex-col items-center justify-center h-full opacity-40">
        <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">terminal</span>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No Events Logged</p>
        <p className="text-xs text-slate-400 mt-2">Execute a workflow to see the audit trail.</p>
      </div>
    );
  }

  const reversed = [...auditEvents].reverse();

  return (
    <div className="flex-1 bg-white h-full overflow-y-auto flex flex-col shadow-inner">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-surface shrink-0 z-10 sticky top-0 shadow-sm">
        <span className="text-xs font-bold uppercase tracking-widest text-on-surface">Audit Trail</span>
        <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded-full">{auditEvents.length} Events</span>
      </div>
      <div className="flex flex-col pb-10">
        {reversed.map((entry, i) => (
          <AuditRow key={`${entry.ts}-${i}`} entry={entry} index={auditEvents.length - 1 - i} numEvents={auditEvents.length} />
        ))}
      </div>
    </div>
  );
}
