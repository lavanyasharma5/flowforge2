/**
 * useWorkflow.js — SSE consumer + workflow state management v2
 * Adds: workflow history, AI explainer, threat simulation
 */
import { useState, useRef, useCallback, useEffect } from "react";

export function useWorkflow() {
  const [runId, setRunId] = useState(null);
  const [status, setStatus] = useState("idle");
  const [workflowName, setWorkflowName] = useState("");
  const [tasks, setTasks] = useState([]);
  const [taskStates, setTaskStates] = useState({});
  const [auditEvents, setAuditEvents] = useState([]);
  const [error, setError] = useState(null);
  const [canRollback, setCanRollback] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [history, setHistory] = useState([]);
  const [mcpTools, setMcpTools] = useState(null);
  const sseRef = useRef(null);
  const auditEventsRef = useRef([]);
  const workflowNameRef = useRef("");

  useEffect(() => { auditEventsRef.current = auditEvents; }, [auditEvents]);
  useEffect(() => { workflowNameRef.current = workflowName; }, [workflowName]);

  const updateTask = useCallback((taskId, patch) => {
    setTaskStates((prev) => ({
      ...prev,
      [taskId]: { ...(prev[taskId] || {}), ...patch },
    }));
  }, []);

  const connectSSE = useCallback((rid) => {
    if (sseRef.current) sseRef.current.close();
    const es = new EventSource(`/api/workflow/${rid}/stream`);
    sseRef.current = es;

    const handle = (eventName) => (e) => {
      const data = JSON.parse(e.data);
      setAuditEvents((prev) => [...prev, { event: eventName, data, ts: Date.now() }]);

      switch (eventName) {
        case "workflow_start":  setStatus("running"); break;
        case "task_start":
          updateTask(data.taskId, { status: "running", tool: data.tool, parameters: data.parameters, reasoning: data.reasoning });
          break;
        case "task_done":
          updateTask(data.taskId, { status: data.success ? "done" : "failed", stdout: data.stdout, stderr: data.stderr, exitCode: data.exitCode });
          break;
        case "task_failed":
          updateTask(data.taskId, { status: "failed", stderr: data.error });
          setCanRollback(true);
          break;
        case "task_rejected":
          updateTask(data.taskId, { status: "rejected", stderr: data.reason });
          setCanRollback(true);
          break;
        case "workflow_done":
          setStatus("done");
          setCanRollback(false);
          es.close();
          break;
        case "rollback_start":  setStatus("rolling_back"); break;
        case "rollback_task":   updateTask(data.taskId, { status: "rolled_back" }); break;
        case "rollback_done":
          setStatus("rolled_back");
          setCanRollback(false);
          es.close();
          break;
        case "error":
          setError(data.message);
          setStatus("failed");
          setCanRollback(true);
          break;
      }
    };

    ["workflow_start","task_start","task_done","task_failed","task_rejected",
     "workflow_done","rollback_start","rollback_task","rollback_done","error"]
      .forEach((evt) => es.addEventListener(evt, handle(evt)));

    es.onerror = () => {};
  }, [updateTask]);

  const runWorkflow = useCallback(async (instruction) => {
    setStatus("loading");
    setError(null);
    setAuditEvents([]);
    setTaskStates({});
    setTasks([]);
    setCanRollback(false);
    setExplanation(null);

    try {
      const parseRes = await fetch("/api/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction }),
      });
      if (!parseRes.ok) {
        const err = await parseRes.json();
        throw new Error(err.error || "Failed to parse workflow");
      }
      const { runId: rid, workflowName: wfName, tasks: parsedTasks } = await parseRes.json();

      setRunId(rid);
      setWorkflowName(wfName);
      setTasks(parsedTasks);
      const initialStates = {};
      parsedTasks.forEach((t) => { initialStates[t.id] = { status: "pending" }; });
      setTaskStates(initialStates);

      connectSSE(rid);
      await fetch(`/api/workflow/${rid}/execute`, { method: "POST" });
    } catch (err) {
      setError(err.message);
      setStatus("failed");
    }
  }, [connectSSE]);

  const triggerRollback = useCallback(async () => {
    if (!runId) return;
    await fetch(`/api/workflow/${runId}/rollback`, { method: "POST" });
  }, [runId]);

  const explainRun = useCallback(async (wfName, events) => {
    setIsExplaining(true);
    setExplanation(null);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow_name: wfName || workflowNameRef.current,
          audit_events: events || auditEventsRef.current,
        }),
      });
      if (!res.ok) throw new Error("Explain request failed");
      const { explanation: text } = await res.json();
      setExplanation(text);
    } catch (e) {
      setExplanation(`Error generating explanation: ${e.message}`);
    } finally {
      setIsExplaining(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      setHistory(data.runs || []);
    } catch (e) {
      console.error("Failed to fetch history:", e);
    }
  }, []);

  const fetchMcpTools = useCallback(async () => {
    try {
      const res = await fetch("/api/mcp/tools");
      const data = await res.json();
      setMcpTools(data);
    } catch (e) {
      console.error("Failed to fetch MCP tools:", e);
    }
  }, []);

  useEffect(() => {
    fetchMcpTools();
    fetchHistory();
  }, []);

  useEffect(() => () => sseRef.current?.close(), []);

  return {
    runId, status, workflowName, tasks, taskStates,
    auditEvents, error, canRollback,
    explanation, isExplaining,
    history, mcpTools,
    runWorkflow, triggerRollback,
    explainRun, fetchHistory,
  };
}
