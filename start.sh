#!/usr/bin/env bash
# start.sh — Start all Operon services locally
# Usage: ./start.sh
# Set GEMINI_API_KEY before running or add it to orchestrator/.env

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔥 Starting Operon..."

# ── MCP Server ──────────────────────────────────────────────────────
echo "  → Starting MCP Server (port 8000)..."
cd "$ROOT/mcp-server"
if [ ! -d ".venv" ]; then
  echo "    Creating Python 3.12 venv..."
  python3.12 -m venv .venv
  source .venv/bin/activate
  pip install -q -r requirements.txt
else
  source .venv/bin/activate
fi
mkdir -p data
SANDBOX_MODE=simulated DB_PATH=./data/audit.db \
  uvicorn main:app --port 8000 --host 0.0.0.0 --log-level warning &
MCP_PID=$!

# ── Orchestrator ─────────────────────────────────────────────────────
echo "  → Starting Orchestrator (port 3001)..."
cd "$ROOT/orchestrator"
if [ ! -d "node_modules" ]; then npm install -q; fi
node src/index.js &
ORCH_PID=$!

# ── Frontend ─────────────────────────────────────────────────────────
echo "  → Starting Frontend (port 5173)..."
cd "$ROOT/frontend"
if [ ! -d "node_modules" ]; then npm install -q; fi
npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!

echo ""
echo "✅ Operon is starting up:"
echo "   Frontend:     http://localhost:5173"
echo "   Orchestrator: http://localhost:3001"
echo "   MCP Server:   http://localhost:8000"
echo "   MCP API Docs: http://localhost:8000/docs"
echo ""
echo "⚠️  Make sure GEMINI_API_KEY is set in orchestrator/.env"
echo ""
echo "Press Ctrl+C to stop all services."

# Wait and kill all on exit
trap "echo 'Stopping...'; kill $MCP_PID $ORCH_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
