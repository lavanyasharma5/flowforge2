/**
 * index.js — Operon Orchestrator v2.0
 * New endpoints: /api/explain, /api/history, /api/mcp/tools, /api/threat-simulation
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { parseInstructionToDAG, explainWorkflow } from "./llm.js";
import { buildDAG } from "./dag.js";
import { executeDAG, rollback } from "./runner.js";
import { PREDEFINED_WORKFLOWS } from "./workflows.js";

const app = express();
const PORT = process.env.PORT || 3001;
const MCP_URL = process.env.MCP_SERVER_URL || "http://localhost:8000";

app.use(cors({ origin: "*" }));
app.use(express.json());

const runs = new Map();

function setupSSE(res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
}

function sendSSE(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ── Health ───────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ status: "ok", version: "2.0.0" }));

// ── Predefined workflows ─────────────────────────────────────────────────────
app.get("/api/workflows", (req, res) => res.json(PREDEFINED_WORKFLOWS));

// ── Start workflow ───────────────────────────────────────────────────────────
app.post("/api/workflow", async (req, res) => {
  const { instruction } = req.body;
  if (!instruction) return res.status(400).json({ error: "instruction is required" });

  const runId = uuidv4();
  try {
    const dag = await parseInstructionToDAG(instruction);
    const { sorted, levels } = buildDAG(dag.tasks);
    runs.set(runId, { dag, levels, sorted, completed: [], failedTask: null, sseClients: new Set(), status: "pending", instruction });
    res.json({ runId, workflowName: dag.workflow_name, tasks: dag.tasks });
  } catch (err) {
    console.error("Workflow parse error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── SSE stream ───────────────────────────────────────────────────────────────
app.get("/api/workflow/:runId/stream", (req, res) => {
  const run = runs.get(req.params.runId);
  if (!run) return res.status(404).json({ error: "Run not found" });
  setupSSE(res);
  run.sseClients.add(res);
  req.on("close", () => run.sseClients.delete(res));
  const hb = setInterval(() => res.write(": heartbeat\n\n"), 15000);
  req.on("close", () => clearInterval(hb));
  if (run.status === "done" || run.status === "failed") {
    sendSSE(res, "run_state", { status: run.status, runId: req.params.runId });
  }
});

// ── Execute workflow ─────────────────────────────────────────────────────────
app.post("/api/workflow/:runId/execute", async (req, res) => {
  const { runId } = req.params;
  const run = runs.get(runId);
  if (!run) return res.status(404).json({ error: "Run not found" });
  if (run.status !== "pending") return res.status(409).json({ error: "Run already started" });

  run.status = "running";
  res.json({ ok: true, runId });

  const emit = (event, data) => { for (const c of run.sseClients) sendSSE(c, event, data); };

  try {
    const { completed, failedTask } = await executeDAG(runId, run.dag.workflow_name, run.levels, emit);
    run.completed = completed;
    run.failedTask = failedTask;
    run.status = failedTask ? "failed" : "done";
  } catch (err) {
    console.error("Execute error:", err);
    run.status = "failed";
    emit("error", { message: err.message });
  }
});

// ── Rollback ─────────────────────────────────────────────────────────────────
app.post("/api/workflow/:runId/rollback", async (req, res) => {
  const { runId } = req.params;
  const run = runs.get(runId);
  if (!run) return res.status(404).json({ error: "Run not found" });
  res.json({ ok: true, rolling: run.completed.length });
  const emit = (event, data) => { for (const c of run.sseClients) sendSSE(c, event, data); };
  await rollback(runId, run.completed, emit);
  run.status = "rolled_back";
  run.completed = [];
});

// ── Run state snapshot ───────────────────────────────────────────────────────
app.get("/api/workflow/:runId", (req, res) => {
  const run = runs.get(req.params.runId);
  if (!run) return res.status(404).json({ error: "Run not found" });
  res.json({ runId: req.params.runId, status: run.status, workflowName: run.dag?.workflow_name, tasks: run.dag?.tasks, completedCount: run.completed.length, failedTask: run.failedTask });
});

// ── Audit proxy ──────────────────────────────────────────────────────────────
app.get("/api/audit", async (req, res) => {
  try {
    const params = new URLSearchParams(req.query).toString();
    const data = await fetch(`${MCP_URL}/audit?${params}`).then(r => r.json());
    res.json(data);
  } catch (e) { res.status(502).json({ error: `MCP unreachable: ${e.message}` }); }
});

// ── MCP tools/list proxy (real MCP protocol) ─────────────────────────────────
app.get("/api/mcp/tools", async (req, res) => {
  try {
    const data = await fetch(`${MCP_URL}/mcp/tools/list`).then(r => r.json());
    res.json(data);
  } catch (e) { res.status(502).json({ error: `MCP unreachable: ${e.message}` }); }
});

// ── Workflow history ─────────────────────────────────────────────────────────
app.get("/api/history", async (req, res) => {
  try {
    const data = await fetch(`${MCP_URL}/history`).then(r => r.json());
    res.json(data);
  } catch (e) { res.status(502).json({ error: `MCP unreachable: ${e.message}` }); }
});

// ── Threat simulation info ───────────────────────────────────────────────────
app.get("/api/threat-simulation", async (req, res) => {
  try {
    const data = await fetch(`${MCP_URL}/threat-simulation`).then(r => r.json());
    res.json(data);
  } catch (e) { res.status(502).json({ error: `MCP unreachable: ${e.message}` }); }
});

// ── AI Explainer (NEW) ────────────────────────────────────────────────────────
app.post("/api/explain", async (req, res) => {
  const { audit_events, workflow_name } = req.body;
  if (!audit_events || !audit_events.length) return res.status(400).json({ error: "audit_events required" });
  try {
    const explanation = await explainWorkflow(workflow_name, audit_events);
    res.json({ explanation });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`🔥 Operon Orchestrator v2.0 on http://localhost:${PORT}`);
  console.log(`   MCP Server: ${MCP_URL}`);
  console.log(`   Ollama: ${process.env.OLLAMA_URL || "http://localhost:11434"} (model: ${process.env.OLLAMA_MODEL || "llama3.2"})`);
});
