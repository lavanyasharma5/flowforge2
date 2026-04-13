"""
sandbox.py — Execute commands inside Docker sandbox or simulated local mode v2.0
"""
import os, asyncio, shutil
from pathlib import Path

SANDBOX_MODE      = os.getenv("SANDBOX_MODE", "simulated")
SANDBOX_CONTAINER = os.getenv("SANDBOX_CONTAINER", "operon-sandbox")
SIMULATED_ROOT    = Path(os.getenv("SIMULATED_ROOT", "/tmp/operon-sandbox")).resolve()


def _ensure_root():
    SIMULATED_ROOT.mkdir(parents=True, exist_ok=True)


def _safe_path(path: str) -> Path:
    resolved = (SIMULATED_ROOT / path.lstrip("/")).resolve()
    if not str(resolved).startswith(str(SIMULATED_ROOT)):
        raise ValueError(f"Path traversal attempt: {path}")
    return resolved

def _normalize_docker_path(path: str | None) -> str | None:
    if not path:
        return "/workspace"
    path = str(path).strip()
    if path.startswith("/workspace"):
        return path
    if path.startswith("/"):
        return "/workspace" + path
    return "/workspace/" + path


async def create_directory(path: str) -> dict:
    if SANDBOX_MODE == "docker":
        return await _docker_exec(f"mkdir -p '{_normalize_docker_path(path)}'")
    _ensure_root()
    _safe_path(path).mkdir(parents=True, exist_ok=True)
    return {"stdout": f"Created directory: {path}", "stderr": "", "exit_code": 0}


async def create_file(path: str, content: str) -> dict:
    if SANDBOX_MODE == "docker":
        clean_path = _normalize_docker_path(path)
        return await _docker_exec(f"mkdir -p $(dirname '{clean_path}') && cat > '{clean_path}' << 'OPERON_EOF'\n{content}\nOPERON_EOF")
    _ensure_root()
    target = _safe_path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    return {"stdout": f"Created file: {path} ({len(content)} bytes)", "stderr": "", "exit_code": 0}


async def write_config(path: str, content: str) -> dict:
    return await create_file(path, content)


async def run_command(command: str | list, cwd: str | None = None) -> dict:
    if isinstance(command, list):
        import shlex
        command = shlex.join([str(c) for c in command])
        
    if SANDBOX_MODE == "docker":
        return await _docker_exec(command, cwd=_normalize_docker_path(cwd))
    _ensure_root()
    run_dir = str(_safe_path(cwd)) if cwd else str(SIMULATED_ROOT)
    return await _local_exec(command, cwd=run_dir)


async def install_package(package: str, manager: str, cwd: str | None = None) -> dict:
    cmd_map = {
        "npm": f"npm install {package} --no-fund --no-audit",
        "yarn": f"yarn add {package}",
        "pip": f"pip install --quiet {package} --break-system-packages",
        "pip3": f"pip3 install --quiet {package} --break-system-packages",
        "npx": f"npx {package}"
    }
    cmd = cmd_map.get(manager, f"{manager} install {package}")
    if SANDBOX_MODE == "docker":
        return await _docker_exec(cmd, cwd=_normalize_docker_path(cwd))
    _ensure_root()
    run_dir = str(_safe_path(cwd)) if cwd else str(SIMULATED_ROOT)
    return await _local_exec(cmd, cwd=run_dir)


async def delete_file(path: str) -> dict:
    """Rollback-safe deletion — only within sandbox root."""
    if SANDBOX_MODE == "docker":
        return await _docker_exec(f"rm -f '{_normalize_docker_path(path)}'")
    _ensure_root()
    target = _safe_path(path)
    if target.exists():
        target.unlink()
    return {"stdout": f"Deleted file: {path}", "stderr": "", "exit_code": 0}


async def delete_directory(path: str) -> dict:
    """Rollback-safe deletion — only within sandbox root."""
    if SANDBOX_MODE == "docker":
        return await _docker_exec(f"rm -rf '{_normalize_docker_path(path)}'")
    _ensure_root()
    target = _safe_path(path)
    if target.exists():
        shutil.rmtree(target)
    return {"stdout": f"Deleted directory: {path}", "stderr": "", "exit_code": 0}


async def _docker_exec(cmd: str, cwd: str = None) -> dict:
    args = ["docker", "exec", SANDBOX_CONTAINER, "sh", "-c"]
    if cwd:
        args.append(f"mkdir -p '{cwd}' && cd '{cwd}' && {cmd}")
    else:
        args.append(cmd)
    return await _run_subprocess(args)


async def _local_exec(cmd: str, cwd: str) -> dict:
    return await _run_subprocess(["sh", "-c", cmd], cwd=cwd)


async def _run_subprocess(args: list[str], cwd: str = None) -> dict:
    try:
        proc = await asyncio.create_subprocess_exec(*args, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE, cwd=cwd)
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
        return {"stdout": stdout.decode("utf-8", errors="replace").strip(), "stderr": stderr.decode("utf-8", errors="replace").strip(), "exit_code": proc.returncode}
    except asyncio.TimeoutError:
        return {"stdout": "", "stderr": "Command timed out after 120s", "exit_code": -1}
    except Exception as e:
        return {"stdout": "", "stderr": str(e), "exit_code": -1}
