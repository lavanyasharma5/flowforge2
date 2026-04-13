/**
 * llm.js — Ollama LLM integration (replaces Gemini)
 *
 * Uses Ollama's OpenAI-compatible REST API — no npm package needed, just fetch().
 * Default model: llama3.2  (change OLLAMA_MODEL env var to use any other pulled model)
 * Ollama URL:    http://ollama:11434  (docker-compose service name)
 */

const OLLAMA_URL   = process.env.OLLAMA_URL   || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";

const SYSTEM_PROMPT = `You are Operon's AI planner. Convert natural language workflow instructions into structured JSON task graphs (DAGs).

## Rules
1. Return ONLY valid JSON — no markdown fences, no explanation text outside the JSON.
2. Every task must have a unique "id" (like "t1", "t2", etc.)
3. "depends_on" is an array of task IDs that must complete before this task runs. Use [] for no dependencies.
4. "tool" must be exactly one of: create_file, run_command, install_package, create_directory, write_config
5. "parameters" must match the tool:
   - create_file:      { "path": string, "content": string }
   - run_command:      { "command": string, "cwd": string (optional) }
   - install_package:  { "package": string, "manager": "npm"|"pip"|"yarn", "cwd": string (optional) }
   - create_directory: { "path": string }
   - write_config:     { "path": string, "content": string }
6. "reasoning" must explain WHY this task is needed (1-2 sentences).
7. Keep tasks atomic — one action per task.
8. CRITICAL: Avoid interactive commands. If creating a project (like React/Vite), you MUST use non-interactive CLI flags instead of manually writing out files piece by piece. For example, to create a react app, use the tool "run_command" with: "npx -y create-vite@latest my-app --template react".
9. For install_package or run_command inside a project folder, always include the "cwd" parameter.
10. EXHAUSTIVE GENERATION: You MUST fully implement ALL requested files, folders, and boilerplate code. Do NOT take shortcuts or skip requested files. If the user asks for a server, entry points, or routes, you MUST explicitly generate them using create_file.
11. BOILERPLATE: Always include complete, functional string boilerplate within 'content' for create_file tasks. Never summarize or leave it blank.
12. DEPENDENCY GRAPH: You MUST carefully wire 'depends_on' arrays. Any run_command task that runs a server or uses a framework (like FastAPI or React) MUST explicitly depend on the install_package task that installs it.

Return ONLY a raw JSON object — no markdown code blocks, no backticks, no extra text.

Example output shape:
{"workflow_name":"Example","tasks":[{"id":"t1","name":"Init Vite React","tool":"run_command","parameters":{"command":"npx -y create-vite@latest my-app --template react","cwd":"/workspace"},"depends_on":[],"reasoning":"Initialize standard React project."}]}`;


/**
 * Call Ollama chat API and return the raw text response.
 */
async function ollamaChat(systemPrompt, userMessage, expectJson = false) {
  const body = {
    model: OLLAMA_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userMessage  },
    ],
    stream: false,
    ...(expectJson ? { format: "json" } : {}),
  };

  let res;
  try {
    res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(
      `Cannot reach Ollama at ${OLLAMA_URL}. Is Ollama running? (${e.message})`
    );
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama returned HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();
  return (data.message?.content || "").trim();
}


/**
 * Parse natural language instruction into a validated task DAG.
 */
export async function parseInstructionToDAG(instruction) {
  const raw = await ollamaChat(SYSTEM_PROMPT, instruction, true);

  // Strip markdown fences if the model wrapped output anyway
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(
      `Ollama returned invalid JSON: ${e.message}\nRaw output (first 500 chars): ${raw.slice(0, 500)}`
    );
  }

  if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
    // LLM Fallbacks for smaller models (like Llama 3.2 3B) struggling with exact wrappers
    if (Array.isArray(parsed)) {
      parsed = { workflow_name: "Generated Workflow", tasks: parsed };
    } else if (parsed.id || parsed.task_id || parsed.tool) {
      parsed = { workflow_name: "Generated Workflow", tasks: [parsed] };
    } else {
      throw new Error("Ollama response missing 'tasks' array. Raw: " + raw.slice(0, 300));
    }
  }

  // Normalize id keys internally
  parsed.tasks = parsed.tasks.map(t => {
    if (t.task_id && !t.id) t.id = t.task_id;
    return t;
  });

  return parsed;
}


/**
 * AI Explainer — reads the live audit trail and explains the workflow in plain English.
 */
export async function explainWorkflow(workflowName, auditEvents) {
  const eventSummary = auditEvents
    .filter((e) =>
      ["task_start", "task_done", "task_failed", "task_rejected", "rollback_task"].includes(e.event)
    )
    .map((e) => {
      const d = e.data;
      if (e.event === "task_start")    return `▶ ${d.taskName} [${d.tool}] — ${d.reasoning || ""}`;
      if (e.event === "task_done")     return `✓ ${d.taskName} — ${d.success ? "succeeded" : "failed"} (exit: ${d.exitCode})`;
      if (e.event === "task_failed")   return `✗ ${d.taskName} — FAILED: ${d.error}`;
      if (e.event === "task_rejected") return `⊘ ${d.taskName} — REJECTED by MCP: ${d.reason}`;
      if (e.event === "rollback_task") return `↩ ${d.taskName} — rolled back`;
      return "";
    })
    .filter(Boolean)
    .join("\n");

  const explainSystemPrompt = `You are a technical documentation assistant for Operon, an AI workflow orchestration system.
Explain workflow executions clearly and concisely using markdown formatting.`;

  const userMessage = `Analyze this Operon workflow execution and explain it.

Workflow: "${workflowName || "Unknown"}"

Execution log:
${eventSummary}

Write your explanation with these exact markdown sections:

## What Was Built
(2-3 sentences, plain English)

## Failure Analysis
(If any task failed or was rejected by MCP, you MUST explicitly explain exactly WHY it failed based on the provided error strings. If none failed, just output "Workflow completed successfully without any failures.")

## Security & Rollback Activity
(Explain what the MCP security layer permitted or denied. If a rollback occurred, explicitly explain to the user that Operon automatically reversed the completed tasks by securely deleting the generated files or directories to restore the system to a clean state.)

## Key AI Decisions
(What logic the AI used, any warnings, or developer issues)`;

  return await ollamaChat(explainSystemPrompt, userMessage, false);
}
