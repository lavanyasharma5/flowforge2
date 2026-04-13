"""
main.py — Operon MCP Server v2.0
Fixes: real MCP tools/list, delete tools for rollback, history endpoint, threat simulation.
"""
import json, os
from datetime import datetime, timezone
from typing import Any
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from database import init_db, get_db, AuditLog
from validator import validate_tool, ValidationError
from tools import execute_tool

app = FastAPI(title="Operon MCP Server", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

MCP_TOOL_SCHEMAS = {
    "create_file":      { "description": "Creates a new file with specified content inside the sandbox workspace.", "inputSchema": { "type": "object", "properties": { "path": {"type": "string", "description": "Relative path within /workspace"}, "content": {"type": "string", "description": "File content"} }, "required": ["path", "content"] }, "riskLevel": "low" },
    "create_directory": { "description": "Creates a new directory inside the sandbox.", "inputSchema": { "type": "object", "properties": { "path": {"type": "string"} }, "required": ["path"] }, "riskLevel": "low" },
    "write_config":     { "description": "Writes a config file (JSON/YAML/etc.) to the workspace.", "inputSchema": { "type": "object", "properties": { "path": {"type": "string"}, "content": {"type": "string"} }, "required": ["path", "content"] }, "riskLevel": "low" },
    "run_command":      { "description": "Executes a safe shell command inside Docker sandbox.", "inputSchema": { "type": "object", "properties": { "command": {"type": "string"}, "cwd": {"type": "string"} }, "required": ["command"] }, "riskLevel": "medium" },
    "install_package":  { "description": "Installs a package via npm or pip inside the sandbox.", "inputSchema": { "type": "object", "properties": { "package": {"type": "string"}, "manager": {"type": "string", "enum": ["npm","pip","pip3","yarn","npx"]}, "cwd": {"type": "string"} }, "required": ["package", "manager"] }, "riskLevel": "medium" },
    "delete_file":      { "description": "Deletes a file. ROLLBACK USE ONLY.", "inputSchema": { "type": "object", "properties": { "path": {"type": "string"} }, "required": ["path"] }, "riskLevel": "rollback-only" },
    "delete_directory": { "description": "Deletes a directory. ROLLBACK USE ONLY.", "inputSchema": { "type": "object", "properties": { "path": {"type": "string"} }, "required": ["path"] }, "riskLevel": "rollback-only" },
}

PERMANENTLY_BLOCKED = ["execute_arbitrary_code", "network_request", "read_host_filesystem", "modify_system_files", "access_env_vars"]

class ToolRequest(BaseModel):
    run_id: str
    task_id: str
    task_name: str
    tool_name: str
    parameters: dict[str, Any]
    ai_reasoning: str = ""

class ValidateResponse(BaseModel):
    allowed: bool
    reason: str

class ExecuteResponse(BaseModel):
    success: bool
    stdout: str
    stderr: str
    exit_code: int
    reason: str = ""

@app.on_event("startup")
async def startup():
    await init_db()

@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0", "sandbox_mode": os.getenv("SANDBOX_MODE", "simulated")}

@app.get("/mcp/tools/list")
async def mcp_tools_list():
    """Real MCP tools/list endpoint per spec 2024-11-05. MISSING from v1."""
    tools = [{"name": n, "description": s["description"], "inputSchema": s["inputSchema"], "riskLevel": s["riskLevel"]} for n, s in MCP_TOOL_SCHEMAS.items()]
    return {"tools": tools, "permanentlyBlocked": PERMANENTLY_BLOCKED, "protocolVersion": "2024-11-05", "serverName": "operon-mcp", "serverVersion": "2.0.0"}

@app.post("/validate", response_model=ValidateResponse)
async def validate(req: ToolRequest, db: AsyncSession = Depends(get_db)):
    if req.tool_name in ("delete_file", "delete_directory") and not req.task_id.startswith("rollback-"):
        log = AuditLog(run_id=req.run_id, task_id=req.task_id, task_name=req.task_name, tool_name=req.tool_name, parameters=json.dumps(req.parameters), ai_reasoning=req.ai_reasoning, result="Rejected: destructive op outside rollback", status="rejected", timestamp=datetime.now(timezone.utc))
        db.add(log); await db.commit()
        return ValidateResponse(allowed=False, reason="Destructive operations only permitted during rollback.")
    try:
        allowed, reason = validate_tool(req.tool_name, req.parameters)
    except ValidationError as e:
        allowed, reason = False, e.message
    log = AuditLog(run_id=req.run_id, task_id=req.task_id, task_name=req.task_name, tool_name=req.tool_name, parameters=json.dumps(req.parameters), ai_reasoning=req.ai_reasoning, result="", status="allowed" if allowed else "rejected", timestamp=datetime.now(timezone.utc))
    db.add(log); await db.commit()
    return ValidateResponse(allowed=allowed, reason=reason)

@app.post("/execute", response_model=ExecuteResponse)
async def execute(req: ToolRequest, db: AsyncSession = Depends(get_db)):
    if req.tool_name in ("delete_file", "delete_directory") and not req.task_id.startswith("rollback-"):
        raise HTTPException(status_code=403, detail="Destructive operations only permitted during rollback.")
    try:
        allowed, reason = validate_tool(req.tool_name, req.parameters)
    except ValidationError as e:
        allowed, reason = False, e.message
    if not allowed:
        log = AuditLog(run_id=req.run_id, task_id=req.task_id, task_name=req.task_name, tool_name=req.tool_name, parameters=json.dumps(req.parameters), ai_reasoning=req.ai_reasoning, result=f"Rejected: {reason}", status="rejected", timestamp=datetime.now(timezone.utc))
        db.add(log); await db.commit()
        raise HTTPException(status_code=403, detail=reason)
    result = await execute_tool(req.tool_name, req.parameters)
    success = result.get("exit_code", -1) == 0
    log = AuditLog(run_id=req.run_id, task_id=req.task_id, task_name=req.task_name, tool_name=req.tool_name, parameters=json.dumps(req.parameters), ai_reasoning=req.ai_reasoning, result=json.dumps(result), status="success" if success else "failed", timestamp=datetime.now(timezone.utc))
    db.add(log); await db.commit()
    return ExecuteResponse(success=success, stdout=result.get("stdout", ""), stderr=result.get("stderr", ""), exit_code=result.get("exit_code", -1))

@app.get("/audit")
async def audit_log(run_id: str = None, page: int = 1, per_page: int = 50, db: AsyncSession = Depends(get_db)):
    query = select(AuditLog).order_by(AuditLog.timestamp.desc())
    if run_id:
        query = query.where(AuditLog.run_id == run_id)
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()
    rows = (await db.execute(query.offset((page - 1) * per_page).limit(per_page))).scalars().all()
    return {"total": total, "page": page, "per_page": per_page, "items": [{"id": r.id, "run_id": r.run_id, "task_id": r.task_id, "task_name": r.task_name, "tool_name": r.tool_name, "parameters": json.loads(r.parameters) if r.parameters else {}, "ai_reasoning": r.ai_reasoning, "result": json.loads(r.result) if r.result and r.result.startswith("{") else r.result, "status": r.status, "timestamp": r.timestamp.isoformat()} for r in rows]}

@app.get("/history")
async def workflow_history(db: AsyncSession = Depends(get_db)):
    """NEW: All past workflow runs with summary stats."""
    result = await db.execute(select(AuditLog.run_id, func.min(AuditLog.timestamp).label("started_at"), func.max(AuditLog.timestamp).label("last_updated"), func.count(AuditLog.id).label("event_count")).group_by(AuditLog.run_id).order_by(func.min(AuditLog.timestamp).desc()).limit(50))
    runs = []
    for row in result.all():
        name_r = await db.execute(select(AuditLog.task_name).where(AuditLog.run_id == row.run_id).where(AuditLog.task_name != "").limit(1))
        first_task = name_r.scalar_one_or_none() or "Unknown Workflow"
        status_r = await db.execute(select(AuditLog.status, func.count(AuditLog.id)).where(AuditLog.run_id == row.run_id).group_by(AuditLog.status))
        sc = {s: c for s, c in status_r.all()}
        overall = "rolled_back" if sc.get("rolled_back", 0) > 0 else ("failed" if sc.get("failed", 0) > 0 else ("rejected" if sc.get("rejected", 0) > 0 else "success"))
        runs.append({"run_id": row.run_id, "first_task_name": first_task, "started_at": row.started_at.isoformat(), "last_updated": row.last_updated.isoformat(), "event_count": row.event_count, "status_counts": sc, "overall_status": overall})
    return {"runs": runs}

@app.get("/threat-simulation")
async def threat_simulation_info():
    """NEW: Threat simulation metadata."""
    return {"blocked_tools": PERMANENTLY_BLOCKED, "example_threats": [{"instruction": "Delete all project files", "would_generate_tool": "delete_directory", "blocked_at": "MCP validator — destructive op outside rollback"}, {"instruction": "Export files to external server", "would_generate_tool": "network_request", "blocked_at": "MCP validator — permanently blocked tool"}, {"instruction": "Run rm -rf /*", "would_generate_tool": "run_command", "blocked_at": "MCP validator — dangerous command pattern"}]}
