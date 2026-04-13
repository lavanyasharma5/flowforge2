/**
 * ExplainerPanel.jsx — AI-powered workflow explanation via Ollama
 * NEW FEATURE: Uses local Ollama LLM to explain what the workflow did in plain English.
 * Copilot cannot do this — it has no access to the live runtime audit trail.
 */

function MarkdownRenderer({ text }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-2 text-sm text-slate-700 leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("## "))  return <h2 key={i} className="text-base font-black text-slate-900 mt-5 mb-2 border-b border-slate-200 pb-1">{line.slice(3)}</h2>;
        if (line.startsWith("### ")) return <h3 key={i} className="text-sm font-bold text-slate-800 mt-4 mb-1">{line.slice(4)}</h3>;
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-blue-500 mt-0.5 shrink-0">•</span>
              <span>{renderInline(line.slice(2))}</span>
            </div>
          );
        }
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className="font-mono text-xs bg-slate-100 text-blue-700 px-1.5 py-0.5 rounded border border-slate-200">{part.slice(1, -1)}</code>;
    return part;
  });
}

export default function ExplainerPanel({ explanation, isExplaining, onExplain, canExplain, status }) {
  const isDone = status === "done" || status === "failed" || status === "rolled_back";

  if (isExplaining) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center gap-4 bg-white">
        <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center animate-pulse">
          <span className="material-symbols-outlined text-violet-600 text-2xl">auto_awesome</span>
        </div>
        <p className="text-sm font-semibold text-slate-600">Ollama is analyzing your workflow…</p>
        <p className="text-xs text-slate-400">Reading the audit trail and generating explanation</p>
      </div>
    );
  }

  if (!explanation) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center gap-4 bg-white">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${canExplain ? "bg-violet-100" : "bg-slate-100"}`}>
          <span className={`material-symbols-outlined text-3xl ${canExplain ? "text-violet-500" : "text-slate-300"}`}>auto_awesome</span>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-700 mb-1">AI Workflow Explainer</p>
          <p className="text-xs text-slate-400 max-w-xs">
            {canExplain
              ? "Run a workflow first, then click below to get a plain-English explanation of what the AI did, why, and what was built."
              : "Execute a workflow to enable AI explanation."}
          </p>
        </div>
        {canExplain && isDone && (
          <button
            onClick={onExplain}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-colors shadow-md shadow-violet-200"
          >
            <span className="material-symbols-outlined text-sm">auto_awesome</span>
            Generate Explanation
          </button>
        )}
        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 max-w-sm">
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2">Why this is unique</p>
          <p className="text-xs text-slate-600 leading-relaxed">
            This feature uses a local Ollama LLM to read the live audit trail — every tool called, every MCP
            decision, every result — and explains it in plain English.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-violet-600 text-sm">auto_awesome</span>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-700">AI Explanation</span>
          <span className="text-[10px] font-semibold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">Ollama (local)</span>
        </div>
        <button
          onClick={onExplain}
          className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700 px-3 py-1.5 rounded-lg hover:bg-violet-50 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Regenerate
        </button>
      </div>
      <div className="p-6 max-w-3xl">
        <MarkdownRenderer text={explanation} />
      </div>
    </div>
  );
}
