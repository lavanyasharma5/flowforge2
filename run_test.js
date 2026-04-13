import fs from 'fs';
fetch("http://localhost:3001/api/workflow", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    instruction: "Set up a Python FastAPI backend called api-server by creating files manually. Create: /workspace/api-server directory, requirements.txt (fastapi, uvicorn[standard], pydantic), main.py with a FastAPI app and /health endpoint, routers/ directory, routers/items.py with a sample router. Use install_package with manager=pip and cwd=/workspace/api-server to install from requirements.txt. Do NOT use any interactive commands."
  })
}).then(r => r.json()).then(async d => {
  if (d.error) {
    console.error("PARSE ERROR", d.error);
    return;
  }
  console.log("Run ID:", d.runId);
  for (const t of d.tasks) {
     console.log(`[${t.tool}] -> ${t.parameters?.path || t.parameters?.command || t.parameters?.package || ''}`);
  }
  const r2 = await fetch(`http://localhost:3001/api/workflow/${d.runId}/execute`, { method: "POST" });
  console.log("Execute response:", r2.status);
}).catch(console.error);
