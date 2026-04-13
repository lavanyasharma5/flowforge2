import { useState } from "react";
import WorkflowInput from "./components/WorkflowInput";
import TaskGraph from "./components/TaskGraph";
import AuditLog from "./components/AuditLog";
import RollbackBanner from "./components/RollbackBanner";
import ExplainerPanel from "./components/ExplainerPanel";
import HistoryPanel from "./components/HistoryPanel";
import McpInspector from "./components/McpInspector";
import ThreatSimulator from "./components/ThreatSimulator";
import { useWorkflow } from "./hooks/useWorkflow";

const STATUS_BADGE = {
  idle:         { label: "Ready",        cls: "bg-slate-100 text-slate-600" },
  loading:      { label: "Parsing…",     cls: "bg-amber-100 text-amber-700 animate-pulse" },
  running:      { label: "Running",      cls: "bg-blue-100 text-blue-700 font-bold" },
  done:         { label: "Complete",     cls: "bg-emerald-100 text-emerald-700" },
  failed:       { label: "Failed",       cls: "bg-red-100 text-red-700" },
  rolling_back: { label: "Rolling back", cls: "bg-orange-100 text-orange-700" },
  rolled_back:  { label: "Rolled back",  cls: "bg-purple-100 text-purple-700" },
};

function StatusBadge({ status }) {
  const meta = STATUS_BADGE[status] || STATUS_BADGE.idle;
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

function TaskSummary({ tasks, taskStates }) {
  if (!tasks.length) return null;
  const counts = { done: 0, running: 0, failed: 0, pending: 0, rejected: 0, rolled_back: 0 };
  tasks.forEach((t) => {
    const s = taskStates[t.id]?.status || "pending";
    counts[s] = (counts[s] || 0) + 1;
  });
  return (
    <div className="flex flex-wrap gap-2 text-[11px] font-medium mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
      {counts.done > 0       && <span className="text-emerald-600">✓ {counts.done} done</span>}
      {counts.running > 0    && <span className="text-blue-600 font-bold animate-pulse">◌ {counts.running} running</span>}
      {counts.pending > 0    && <span className="text-slate-400">○ {counts.pending} pending</span>}
      {counts.failed > 0     && <span className="text-red-600">✗ {counts.failed} failed</span>}
      {counts.rejected > 0   && <span className="text-orange-600">⊘ {counts.rejected} rejected</span>}
      {counts.rolled_back > 0 && <span className="text-purple-600">↩ {counts.rolled_back} rolled back</span>}
    </div>
  );
}

const TABS = [
  { id: "graph",    icon: "account_tree",  label: "Task Graph"    },
  { id: "audit",    icon: "terminal",      label: "Audit Log"     },
  { id: "explain",  icon: "auto_awesome",  label: "AI Explainer"  },
  { id: "history",  icon: "history",       label: "Run History"   },
  { id: "mcp",      icon: "security",      label: "MCP Inspector" },
  { id: "threat",   icon: "bug_report",    label: "Threat Sim"    },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("graph");
  const [instruction, setInstruction] = useState("");

  const {
    status, workflowName, tasks, taskStates,
    auditEvents, error, canRollback,
    explanation, isExplaining,
    history, mcpTools,
    runWorkflow, triggerRollback,
    explainRun, fetchHistory,
  } = useWorkflow();

  const isRunning = status === "loading" || status === "running";

  const handleExecute = () => {
    if (instruction.trim() && !isRunning) runWorkflow(instruction.trim());
  };

  // Badge counts per tab
  const tabBadge = {
    graph:   tasks.length || null,
    audit:   auditEvents.length || null,
    explain: explanation ? "✓" : null,
    history: history.length || null,
    mcp:     mcpTools?.tools?.length || null,
    threat:  null,
  };

  return (
    <div className="h-screen w-full flex flex-col bg-[#f8f9fa] text-slate-800 font-sans overflow-hidden">

      {/* ── Top Nav ── */}
      <header className="h-14 shrink-0 flex items-center justify-between px-5 bg-white border-b border-slate-200 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-white text-[18px]">memory</span>
          </div>
          <div>
            <span className="text-sm font-black tracking-tight text-slate-900">Operon</span>
            <span className="ml-2 text-[10px] uppercase tracking-widest text-slate-400 font-semibold">v2.0</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {workflowName && (
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full max-w-[200px] truncate">
              {workflowName}
            </span>
          )}
          <StatusBadge status={status} />
          <div className="h-5 w-px bg-slate-200" />
          <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer"
            className="text-xs font-semibold text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">open_in_new</span> MCP Docs
          </a>
        </div>
      </header>

      {/* ── Banners ── */}
      {(canRollback || status === "rolling_back" || status === "rolled_back") && (
        <RollbackBanner onRollback={triggerRollback} status={status} />
      )}
      {error && (
        <div className="bg-red-50 text-red-700 px-5 py-2 text-xs font-semibold border-b border-red-200 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">error</span>
          {error}
        </div>
      )}

      {/* ── Main Layout ── */}
      <main className="flex-1 flex overflow-hidden">

        {/* Left Sidebar — Input */}
        <aside className="w-[360px] shrink-0 flex flex-col border-r border-slate-200 bg-white overflow-y-auto p-5 z-10">
          <WorkflowInput
            instruction={instruction}
            setInstruction={setInstruction}
            isRunning={isRunning}
            onExecute={handleExecute}
            status={status}
          />

          <TaskSummary tasks={tasks} taskStates={taskStates} />

          {/* Legend */}
          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-3">Node Status</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { color: "bg-slate-200",    label: "Pending"     },
                { color: "bg-blue-500",     label: "Running"     },
                { color: "bg-emerald-400",  label: "Done"        },
                { color: "bg-red-500",      label: "Failed"      },
                { color: "bg-orange-500",   label: "Rejected"    },
                { color: "bg-purple-500",   label: "Rolled back" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-2 text-[11px] text-slate-600">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${l.color}`} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>

          {/* Quick action: Explain after run */}
          {(status === "done" || status === "failed" || status === "rolled_back") && auditEvents.length > 0 && (
            <button
              onClick={() => { explainRun(); setActiveTab("explain"); }}
              disabled={isExplaining}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              {isExplaining ? "Generating explanation…" : "Explain this run with AI"}
            </button>
          )}
        </aside>

        {/* Right — Tabs + Panels */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Tab Bar */}
          <div className="flex gap-0.5 px-3 pt-2 border-b border-slate-200 bg-white shrink-0 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold tracking-wide uppercase whitespace-nowrap transition-colors border-b-2 rounded-t-md ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600 bg-blue-50"
                    : "border-transparent text-slate-500 hover:bg-slate-50"
                }`}
              >
                <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                {tab.label}
                {tabBadge[tab.id] != null && (
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    activeTab === tab.id ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {tabBadge[tab.id]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Panel Content */}
          <div className="flex-1 relative overflow-hidden">
            {activeTab === "graph" && (
              <TaskGraph tasks={tasks} taskStates={taskStates} workflowName={workflowName} />
            )}
            {activeTab === "audit" && (
              <AuditLog auditEvents={auditEvents} />
            )}
            {activeTab === "explain" && (
              <ExplainerPanel
                explanation={explanation}
                isExplaining={isExplaining}
                onExplain={() => explainRun()}
                canExplain={auditEvents.length > 0}
                status={status}
              />
            )}
            {activeTab === "history" && (
              <HistoryPanel
                history={history}
                onRefresh={fetchHistory}
              />
            )}
            {activeTab === "mcp" && (
              <McpInspector mcpTools={mcpTools} />
            )}
            {activeTab === "threat" && (
              <ThreatSimulator />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
