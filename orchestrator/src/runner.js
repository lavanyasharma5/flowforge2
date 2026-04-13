/**
 * runner.js — Task executor with SSE emission, parallel DAG execution, rollback v2.0
 * Fix: rollback now uses delete_file/delete_directory MCP tools (not blocked rm -rf)
 */

const MCP_URL = process.env.MCP_SERVER_URL || "http://localhost:8000";

export async function executeDAG(runId, workflowName, levels, emit) {
  const completed = [];
  let failedTask = null;

  emit("workflow_start", { runId, workflowName, totalTasks: levels.flat().length });

  for (const level of levels) {
    if (failedTask) break;

    // Run all tasks in this level in parallel
    const results = await Promise.allSettled(
      level.map((task) => executeTask(runId, task, emit))
    );

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const task = level[i];
      if (r.status === "fulfilled" && r.value.success) {
        completed.push(task);
      } else {
        if (!failedTask) {
          failedTask = task;
          const errorMsg = r.status === "rejected" ? r.reason?.message : r.value?.stderr;
          emit("task_failed", { runId, taskId: task.id, taskName: task.name, error: errorMsg });
        }
      }
    }
  }

  if (!failedTask) {
    emit("workflow_done", { runId, workflowName, completedCount: completed.length });
  }

  return { completed, failedTask };
}

async function executeTask(runId, task, emit) {
  emit("task_start", {
    runId, taskId: task.id, taskName: task.name,
    tool: task.tool, parameters: task.parameters, reasoning: task.reasoning,
  });

  const mcpBody = {
    run_id: runId, task_id: task.id, task_name: task.name,
    tool_name: task.tool, parameters: task.parameters, ai_reasoning: task.reasoning || "",
  };

  // 1. Validate
  let validation;
  try {
    validation = await fetch(`${MCP_URL}/validate`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mcpBody),
    }).then((r) => r.json());
  } catch (e) {
    throw new Error(`Validation request failed: ${e.message}`);
  }

  if (!validation.allowed) {
    emit("task_rejected", { runId, taskId: task.id, taskName: task.name, reason: validation.reason });
    return { success: false, stderr: validation.reason };
  }

  // 2. Execute
  let result;
  try {
    const execRes = await fetch(`${MCP_URL}/execute`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mcpBody),
    });
    if (!execRes.ok) {
      const text = await execRes.text();
      throw new Error(`MCP execute returned ${execRes.status}: ${text}`);
    }
    result = await execRes.json();
  } catch (e) {
    throw new Error(`Execution request failed: ${e.message}`);
  }

  emit("task_done", {
    runId, taskId: task.id, taskName: task.name,
    tool: task.tool, stdout: result.stdout, stderr: result.stderr,
    exitCode: result.exit_code, success: result.success,
  });

  return result;
}

export async function rollback(runId, completedTasks, emit) {
  emit("rollback_start", { runId, count: completedTasks.length });

  for (const task of [...completedTasks].reverse()) {
    emit("rollback_task", { runId, taskId: task.id, taskName: task.name });
    try {
      const action = getRollbackAction(task);
      if (action) {
        await fetch(`${MCP_URL}/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            run_id: runId,
            task_id: `rollback-${task.id}`,   // "rollback-" prefix unlocks delete tools
            task_name: `Rollback: ${task.name}`,
            tool_name: action.tool_name,
            parameters: action.parameters,
            ai_reasoning: `Rollback of task "${task.name}" due to workflow failure.`,
          }),
        });
      }
    } catch (e) {
      console.error(`Rollback failed for task ${task.id}:`, e.message);
    }
  }

  emit("rollback_done", { runId });
}

/**
 * FIX: Uses delete_file/delete_directory MCP tools instead of `rm -rf` via run_command.
 * The original code used run_command rm -rf which the validator correctly blocked.
 */
function getRollbackAction(task) {
  switch (task.tool) {
    case "create_directory": return { tool_name: "delete_directory", parameters: { path: task.parameters.path } };
    case "create_file":
    case "write_config":     return { tool_name: "delete_file",      parameters: { path: task.parameters.path } };
    case "install_package":  return null;  // Cannot reliably uninstall
    case "run_command":      return null;
    default:                 return null;
  }
}
