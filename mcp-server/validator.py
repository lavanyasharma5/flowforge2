"""
validator.py — Security validation for Operon MCP Server v2.0
"""
from typing import Any

WHITELISTED_TOOLS: dict[str, set[str]] = {
    "create_file":        {"path", "content"},
    "run_command":        {"command"},
    "install_package":    {"package", "manager"},
    "create_directory":   {"path"},
    "write_config":       {"path", "content"},
    "delete_file":        {"path"},
    "delete_directory":   {"path"},
}

PATH_PARAMS = {"path", "cwd"}

DANGEROUS_PATTERNS = ["..", "~", "/etc", "/usr", "/bin", "/sys", "/proc", "/root", "/home", "\\"]

DANGEROUS_COMMANDS = ["rm -rf /", "rm -rf /*", ":(){ :|:& };:", "mkfs", "dd if=", "> /dev/", "chmod 777 /"]


class ValidationError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def validate_tool(tool_name: str, parameters: dict[str, Any]) -> tuple[bool, str]:
    if tool_name not in WHITELISTED_TOOLS:
        return False, f"Tool '{tool_name}' is not on the whitelist. Rejected."
    required = WHITELISTED_TOOLS[tool_name]
    missing = required - set(parameters.keys())
    if missing:
        return False, f"Missing required parameters for '{tool_name}': {missing}"
    for param_key, param_val in parameters.items():
        if not isinstance(param_val, str):
            continue
        if param_key in PATH_PARAMS or "path" in param_key.lower():
            for danger in DANGEROUS_PATTERNS:
                if danger in param_val:
                    return False, f"Dangerous path pattern '{danger}' detected in parameter '{param_key}'."
    if tool_name == "run_command":
        cmd = parameters.get("command", "")
        for bad in DANGEROUS_COMMANDS:
            if bad in cmd:
                return False, f"Dangerous command pattern detected: '{bad}'"
    if tool_name == "install_package":
        manager = parameters.get("manager", "")
        if manager not in ("npm", "pip", "pip3", "yarn", "npx"):
            return False, f"Package manager '{manager}' is not allowed."
    return True, "Validation passed."
