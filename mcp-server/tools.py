"""
tools.py — Dispatch validated tool calls to sandbox implementations v2.0
"""
from typing import Any
import sandbox as sb

TOOL_DISPATCH = {
    "create_file":        lambda p: sb.create_file(p["path"], p["content"]),
    "run_command":        lambda p: sb.run_command(p["command"], p.get("cwd")),
    "install_package":    lambda p: sb.install_package(p["package"], p["manager"], p.get("cwd")),
    "create_directory":   lambda p: sb.create_directory(p["path"]),
    "write_config":       lambda p: sb.write_config(p["path"], p["content"]),
    "delete_file":        lambda p: sb.delete_file(p["path"]),
    "delete_directory":   lambda p: sb.delete_directory(p["path"]),
}

async def execute_tool(tool_name: str, parameters: dict[str, Any]) -> dict:
    handler = TOOL_DISPATCH.get(tool_name)
    if handler is None:
        return {"stdout": "", "stderr": f"No handler for tool '{tool_name}'", "exit_code": -1}
    try:
        return await handler(parameters)
    except ValueError as e:
        return {"stdout": "", "stderr": str(e), "exit_code": -1}
    except Exception as e:
        return {"stdout": "", "stderr": f"Unexpected error: {e}", "exit_code": -1}
