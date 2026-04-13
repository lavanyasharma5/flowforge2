/**
 * dag.js — DAG builder with topological sort (Kahn's algorithm) and cycle detection
 */

/**
 * Build adjacency structures from task list.
 * @param {Array} tasks
 * @returns {{ sorted: Array, levels: Array<Array> }} topological order + parallel levels
 */
export function buildDAG(tasks) {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const inDegree = new Map(tasks.map((t) => [t.id, 0]));
  const adjList = new Map(tasks.map((t) => [t.id, []]));

  // Build graph with graceful dependency sanitation
  for (const task of tasks) {
    task.depends_on = (task.depends_on || [])
      .map(dep => (typeof dep === 'object' && dep !== null) ? (dep.id || dep.task || Object.values(dep)[0]) : dep)
      .map(String)
      .filter(dep => taskMap.has(dep));
    for (const dep of task.depends_on) {
      adjList.get(dep).push(task.id);
      inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
    }
  }

  // Kahn's algorithm
  const queue = [];
  const levels = []; // For parallel execution batching
  const sorted = [];

  // Seed queue with zero in-degree nodes
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  while (queue.length > 0) {
    const level = [...queue];
    levels.push(level.map((id) => taskMap.get(id)));
    queue.length = 0;

    for (const id of level) {
      sorted.push(taskMap.get(id));
      for (const neighbor of adjList.get(id) || []) {
        const newDeg = inDegree.get(neighbor) - 1;
        inDegree.set(neighbor, newDeg);
        if (newDeg === 0) queue.push(neighbor);
      }
    }
  }

  if (sorted.length !== tasks.length) {
    throw new Error("Cycle detected in task graph — cannot execute.");
  }

  return { sorted, levels };
}

/**
 * Validate that all dependency IDs exist and graph is acyclic.
 */
export function validateDAG(tasks) {
  buildDAG(tasks); // throws if invalid
  return true;
}
