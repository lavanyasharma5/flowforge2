# Operon v2 — AI-Powered Workflow Orchestration

Converts natural language instructions into validated, sandboxed, auditable system actions using a **local Ollama LLM** and **MCP security layer**.

## Prerequisites

- Docker Desktop (running)
- ~4GB disk space for the Ollama model

**No API keys needed.** Ollama runs entirely locally.

## Quick Start

```bash
# 1. Start everything (first run downloads llama3.2 ~2GB — takes a few minutes)
docker compose up --build

# 2. Open the app
open http://localhost:5173
```

On first launch, `ollama-pull` automatically downloads `llama3.2`. Subsequent starts are instant.

## Changing the Model

Edit `OLLAMA_MODEL` in `orchestrator/.env`:

```bash
# Options (must be supported by Ollama):
OLLAMA_MODEL=llama3.2          # default, fast, good quality (~2GB)
OLLAMA_MODEL=llama3.1          # larger, better reasoning (~5GB)
OLLAMA_MODEL=mistral           # fast, good for code (~4GB)
OLLAMA_MODEL=codellama         # code-focused (~4GB)
OLLAMA_MODEL=qwen2.5-coder     # excellent for code tasks (~4GB)
OLLAMA_MODEL=deepseek-coder    # strong code generation (~4GB)
```

Then restart: `docker compose restart orchestrator ollama-pull`

## Services

| Service       | Port  | Description                              |
|---------------|-------|------------------------------------------|
| Frontend      | 5173  | React UI — task graph, audit log, panels |
| Orchestrator  | 3001  | Node.js — parses instructions, runs DAG  |
| MCP Server    | 8000  | Python FastAPI — validates & executes    |
| Ollama        | 11434 | Local LLM server                         |

## Features

- **Task Graph** — live DAG visualization with real-time status
- **Audit Log** — every MCP decision logged with AI reasoning
- **AI Explainer** — Ollama explains what the workflow built in plain English
- **Run History** — all past runs persisted in SQLite
- **MCP Inspector** — browse the full tools/list with JSON schemas
- **Threat Simulator** — demonstrates MCP blocking 4 attack vectors live

## Architecture

```
User → React UI → Orchestrator (Node.js)
                      ↓
                  Ollama LLM  ← generates task DAG
                      ↓
              MCP Server (FastAPI)  ← validates every action
                      ↓
              Docker Sandbox  ← isolated execution
                      ↓
              SQLite Audit Log
```

## GPU Acceleration (optional)

Uncomment the `deploy.resources` section in `docker-compose.yml` under the `ollama` service if you have an NVIDIA GPU with `nvidia-container-toolkit` installed.
