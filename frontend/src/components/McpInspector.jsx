/**
 * McpInspector.jsx — Real MCP protocol inspector
 * NEW FEATURE: Shows the live tools/list from MCP server (real MCP protocol).
 * This is the fix for the missing tools/list endpoint — now visualized.
 */

const RISK_STYLE = {
  low:          { cls: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Low Risk — Auto Approved" },
  medium:       { cls: "bg-amber-100 text-amber-700 border-amber-200",       label: "Medium Risk — Validated"  },
  "rollback-only": { cls: "bg-purple-100 text-purple-700 border-purple-200", label: "Rollback Only"             },
};

function ToolCard({ tool }) {
  const risk = RISK_STYLE[tool.riskLevel] || RISK_STYLE.medium;
  const props = tool.inputSchema?.properties || {};
  const required = tool.inputSchema?.required || [];

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-xl">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <code className="text-sm font-bold font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
            {tool.name}
          </code>
          <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full border ${risk.cls}`}>
            {risk.label}
          </span>
        </div>
      </div>
      <p className="text-xs text-slate-600 mb-3">{tool.description}</p>

      {/* JSON Schema properties */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Parameters (JSON Schema)</p>
        {Object.entries(props).map(([key, schema]) => (
          <div key={key} className="flex items-center gap-2 font-mono text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-700">{key}</span>
            <span className="text-slate-400">:</span>
            <span className="text-emerald-600">{schema.type}</span>
            {schema.enum && <span className="text-amber-600 text-[10px]">[{schema.enum.join(" | ")}]</span>}
            {required.includes(key)
              ? <span className="ml-auto text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">required</span>
              : <span className="ml-auto text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">optional</span>
            }
          </div>
        ))}
      </div>
    </div>
  );
}

export default function McpInspector({ mcpTools }) {
  if (!mcpTools) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 bg-white">
        <span className="material-symbols-outlined text-5xl text-slate-200">security</span>
        <p className="text-sm font-bold text-slate-500">Loading MCP tools…</p>
        <p className="text-xs text-slate-400">Fetching tools/list from MCP server</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f8f9fa]">
      <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3 z-10">
        <span className="material-symbols-outlined text-sm text-slate-600">security</span>
        <span className="text-xs font-bold uppercase tracking-widest text-slate-700">MCP Inspector</span>
        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
          Protocol {mcpTools.protocolVersion}
        </span>
        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
          {mcpTools.tools?.length || 0} tools registered
        </span>
      </div>

      <div className="p-5 max-w-3xl space-y-5">
        {/* Protocol info */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-xs font-bold text-blue-800 mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">info</span>
            Real MCP Protocol Compliance (v2 fix)
          </p>
          <p className="text-xs text-blue-700 leading-relaxed">
            This <code className="font-mono bg-blue-100 px-1 rounded">GET /mcp/tools/list</code> endpoint is the actual MCP spec requirement.
            The original v1 was missing this — tools were hardcoded, with no dynamic discovery or JSON Schema definitions.
            Now clients can query available tools at runtime, just like production MCP deployments.
          </p>
        </div>

        {/* Whitelisted tools */}
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-3">Whitelisted Tools</p>
          <div className="space-y-3">
            {(mcpTools.tools || [])
              .filter((t) => t.riskLevel !== "rollback-only")
              .map((tool) => <ToolCard key={tool.name} tool={tool} />)}
          </div>
        </div>

        {/* Rollback-only tools */}
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-3">Rollback-Only Tools</p>
          <div className="space-y-3">
            {(mcpTools.tools || [])
              .filter((t) => t.riskLevel === "rollback-only")
              .map((tool) => <ToolCard key={tool.name} tool={tool} />)}
          </div>
        </div>

        {/* Permanently blocked */}
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-3">Permanently Blocked (Infrastructure Level)</p>
          <div className="space-y-2">
            {(mcpTools.permanentlyBlocked || []).map((name) => (
              <div key={name} className="flex items-center gap-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                <span className="material-symbols-outlined text-red-500 text-sm">block</span>
                <code className="text-sm font-mono font-bold text-red-700">{name}</code>
                <span className="ml-auto text-[10px] font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded-full">BLOCKED FOREVER</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
            These tools are rejected at the infrastructure level — not prompt level. Even a jailbroken AI model cannot execute them.
          </p>
        </div>
      </div>
    </div>
  );
}
