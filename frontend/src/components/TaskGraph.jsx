import { useMemo, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

/*
  The Precision Architect styles
*/

function TaskNode({ data }) {
  const isRunning = data.status === "running";
  const isPending = data.status === "pending";
  const isDone = data.status === "done";
  const isFailed = data.status === "failed";
  const isRejected = data.status === "rejected";

  let containerClass = "w-64 p-5 rounded-2xl flex flex-col gap-3 relative bg-white ";
  if (isRunning) {
    containerClass += "shadow-2xl shadow-blue-500/10 border-l-4 border-l-tertiary border-y border-r border-slate-100";
  } else if (isPending) {
    containerClass += "bg-white/60 backdrop-blur-sm ghost-border grayscale opacity-60";
  } else if (isRejected) {
    containerClass += "shadow-lg border-l-4 border-l-orange-500 border-y border-r border-orange-100 bg-orange-50/50";
  } else if (isFailed) {
    containerClass += "shadow-lg border-l-4 border-l-error border-y border-r border-red-100 bg-red-50/50";
  } else if (isDone) {
    containerClass += "shadow-lg border-l-4 border-l-emerald-500 border-y border-r border-emerald-100 bg-white";
  } else {
    // pending unreached or other
    containerClass += "shadow-lg border border-slate-200 bg-white";
  }

  // Icons based on tool or default
  let iconName = "memory";
  if (isPending) iconName = "pending";
  if (isDone) iconName = "check_circle";
  if (isRejected) iconName = "block";
  else if (isFailed) iconName = "error";

  let headerColor = isRunning ? "text-tertiary" : (isRejected ? "text-orange-500" : (isFailed ? "text-error" : (isDone ? "text-emerald-600" : "text-slate-500")));
  let headerBg = isRunning ? "bg-tertiary/10" : (isRejected ? "bg-orange-500/10" : (isFailed ? "bg-error/10" : (isDone ? "bg-emerald-50" : "bg-slate-100")));
  let iconContainerBg = isRunning ? 'bg-blue-50' : (isRejected ? 'bg-orange-50' : (isFailed ? 'bg-red-50' : (isDone ? 'bg-emerald-50' : 'bg-slate-50')));
  let errorTextColor = isRejected ? "text-orange-600" : "text-error";

  return (
    <div className={containerClass}>
      <Handle type="target" position={Position.Top} style={{ background: 'transparent', border: 'none' }} />
      
      <div className="flex items-center justify-between">
        <span className={`px-2 py-0.5 rounded-full ${headerBg} text-[9px] font-bold ${headerColor} uppercase tracking-tight truncate max-w-[120px]`}>
          {data.tool || "Operation"}
        </span>
        
        {isRunning ? (
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-tertiary rounded-full animate-pulse"></div>
            <span className="text-[9px] font-bold text-tertiary">RUNNING</span>
          </div>
        ) : (
          <span className={`material-symbols-outlined text-sm ${isDone ? "text-emerald-500" : "text-slate-400"}`}>
            {isDone ? "done" : "more_horiz"}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${iconContainerBg} flex items-center justify-center shrink-0`}>
          <span className={`material-symbols-outlined ${headerColor}`}>
            {iconName}
          </span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-on-surface truncate">{data.label}</span>
          <span className={`text-[10px] ${isDone ? "text-emerald-600 font-bold" : "text-on-surface-variant"} truncate`}>
             {data.status.toUpperCase()}
          </span>
          {(isFailed || isRejected) && data.error && (
            <span className={`text-[9px] ${errorTextColor} truncate mt-0.5`} title={data.error}>
              {data.error}
            </span>
          )}
        </div>
      </div>

      {isRunning && (
        <div className="bg-slate-50 p-2 rounded-lg flex items-center justify-between mt-2">
          <span className="text-[10px] font-medium text-slate-500">Executing...</span>
          <span className="text-[10px] font-bold text-tertiary animate-pulse">Wait</span>
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} style={{ background: 'transparent', border: 'none' }} />
    </div>
  );
}

const nodeTypes = { taskNode: TaskNode };

function layoutNodes(tasks, taskStates) {
  const depths = {};
  const computeDepth = (id, visited = new Set()) => {
    if (depths[id] !== undefined) return depths[id];
    if (visited.has(id)) return 0;
    visited.add(id);
    const task = tasks.find((t) => t.id === id);
    if (!task || !task.depends_on || task.depends_on.length === 0) {
      depths[id] = 0;
    } else {
      depths[id] = Math.max(...task.depends_on.map((d) => computeDepth(d, visited))) + 1;
    }
    return depths[id];
  };
  tasks.forEach((t) => computeDepth(t.id));

  const levels = {};
  tasks.forEach((t) => {
    const d = depths[t.id] || 0;
    if (!levels[d]) levels[d] = [];
    levels[d].push(t);
  });

  const nodes = [];
  const COL_W = 340;
  const ROW_H = 180;

  Object.entries(levels).forEach(([depth, levelTasks]) => {
    const d = parseInt(depth);
    levelTasks.forEach((task, i) => {
      const state = taskStates[task.id] || {};
      nodes.push({
        id: task.id,
        type: "taskNode",
        position: {
          x: i * COL_W - ((levelTasks.length - 1) * COL_W) / 2, // Horizontally center
          y: d * ROW_H, // Vertical layout
        },
        data: {
          label: task.name,
          tool: task.tool,
          status: state.status || "pending",
          error: state.stderr || state.stdout || "Execution failed",
        },
      });
    });
  });

  return nodes;
}

function buildEdges(tasks, taskStates) {
  const edges = [];
  for (const task of tasks) {
    for (const dep of task.depends_on || []) {
      const parentState = taskStates[dep]?.status;
      const runningEdge = parentState === "done" && taskStates[task.id]?.status === "running";
      
      edges.push({
        id: `${dep}-${task.id}`,
        source: dep,
        target: task.id,
        animated: runningEdge,
        style: { 
          stroke: runningEdge ? "#0053dc" : "#dbe4e7", 
          strokeWidth: runningEdge ? 3 : 2 
        },
        type: "smoothstep",
      });
    }
  }
  return edges;
}

export default function TaskGraph({ tasks, taskStates, workflowName }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!tasks.length) return;
    setNodes(layoutNodes(tasks, taskStates));
    setEdges(buildEdges(tasks, taskStates));
  }, [tasks, taskStates]);

  if (!tasks.length) {
    return (
      <div className="flex-1 bg-surface relative overflow-hidden flex items-center justify-center h-full">
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(#d1dce0 1px, transparent 1px)", backgroundSize: "32px 32px", opacity: 0.4 }}></div>
        <div className="relative z-10 flex flex-col items-center opacity-40">
          <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">account_tree</span>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Awaiting Orchestration</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-surface relative overflow-hidden h-full">
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(#d1dce0 1px, transparent 1px)", backgroundSize: "32px 32px", opacity: 0.4 }}></div>
      {workflowName && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-surface-container-high rounded-full text-xs font-bold shadow shadow-slate-200 z-50 text-slate-500 border border-slate-200/50">
          {workflowName}
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        style={{ zIndex: 10 }}
      >
        <Controls
          className="bg-white border-slate-200 shadow-sm"
        />
        <MiniMap
          className="bg-surface-container-low border-slate-200 rounded-xl m-4"
          nodeColor={(n) => {
            if (n.data?.status === 'running') return "#0053dc";
            if (n.data?.status === 'done') return "#dbe4e7";
            return "#f1f4f6";
          }}
          maskColor="rgba(255,255,255,0.7)"
        />
      </ReactFlow>
    </div>
  );
}
