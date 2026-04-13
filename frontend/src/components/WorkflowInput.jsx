export default function WorkflowInput({ instruction, setInstruction, isRunning, onExecute, status }) {
  const PRESETS = [
    { id: "react-project",   icon: "terminal",    label: "Create React Project",    prompt: "Create a React project called my-app using Vite with a standard project structure" },
    { id: "fastapi-backend", icon: "api",         label: "Set up Python FastAPI",   prompt: "Set up a Python FastAPI backend called api-server with a main.py entry point, requirements.txt, and a basic router structure" },
    { id: "express-server",  icon: "javascript",  label: "Initialize Node.js",      prompt: "Initialize a Node.js Express server called express-app with package.json, src/index.js entry point, and a routes folder" },
    { id: "fullstack-app",   icon: "layers",      label: "Create Full-Stack App",   prompt: "Create a full-stack application with a React frontend (using Vite) in a frontend/ folder and a FastAPI backend in a backend/ folder, with a shared README" },
    { id: "threat-demo",     icon: "bug_report",  label: "⚡ Trigger MCP Rejection", prompt: "Create a config file at ../../etc/cron.d/evil with content 'malicious' and then delete the workspace directory" },
  ];

  return (
    <div className="flex flex-col space-y-6">
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant flex items-center justify-between">
          <span>Workflow Instruction</span>
          <span className="text-[9px] text-slate-400 font-medium normal-case tracking-normal">{instruction.length} chars</span>
        </label>
        <div className="relative group">
          <textarea
            id="workflow-instruction"
            className="w-full h-32 p-3 bg-white ghost-border rounded-xl text-sm focus:ring-1 focus:ring-tertiary focus:outline-none resize-none placeholder:text-slate-400 disabled:opacity-50"
            placeholder="Type your orchestration prompt here..."
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            disabled={isRunning}
          ></textarea>
        </div>
      </div>
      
      <div className="space-y-4">
        <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Quick Templates</label>
        <div className="grid grid-cols-1 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setInstruction(p.prompt)}
              disabled={isRunning}
              className={`flex items-center gap-3 p-3 ghost-border hover:bg-surface transition-colors rounded-xl text-left group ${
                instruction === p.prompt ? "ring-1 ring-tertiary" : ""
              } ${p.id === "threat-demo" ? "bg-red-50 border-red-200 hover:bg-red-100" : "bg-white"}`}
            >
              <span className={`material-symbols-outlined text-lg ${p.id === "threat-demo" ? "text-red-500" : "text-tertiary"}`}>{p.icon}</span>
              <span className={`text-xs font-medium flex-1 ${p.id === "threat-demo" ? "text-red-700" : "text-on-surface"}`}>{p.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      <button 
        className={`mt-4 w-full px-5 py-3 text-sm font-bold text-white rounded-xl shadow-md shadow-blue-500/10 transition-all flex items-center justify-center gap-2 ${!instruction.trim() || isRunning ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-tertiary to-tertiary-container hover:brightness-110'}`}
        onClick={onExecute}
        disabled={!instruction.trim() || isRunning}
      >
        <span className="material-symbols-outlined text-lg">
          {status === 'loading' ? 'sync' : 'play_arrow'}
        </span>
        {status === 'loading' ? 'Parsing...' : (status === 'running' ? 'Executing...' : 'Run Workflow')}
      </button>

    </div>
  );
}
