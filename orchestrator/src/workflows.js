/**
 * workflows.js — Predefined workflow templates used as few-shot examples
 * for the Claude prompt and as quick-launch options in the UI.
 */

export const PREDEFINED_WORKFLOWS = [
  {
    id: "react-project",
    label: "Create a React Project",
    description: "Scaffold a Vite + React project with basic structure",
    prompt:
      "Scaffold a React project called my-app manually using create_directory, write_config, and create_file tools. " +
      "Create: /workspace/my-app directory, package.json (with react, react-dom, vite deps), " +
      "vite.config.js, index.html, src/main.jsx, src/App.jsx, and src/index.css. " +
      "Do NOT use 'npm create' or any interactive commands. Use install_package for npm deps with cwd=/workspace/my-app.",
  },
  {
    id: "fastapi-backend",
    label: "Set up a Python FastAPI Backend",
    description: "Initialize a FastAPI project with uvicorn and project layout",
    prompt:
      "Set up a Python FastAPI backend called api-server by creating files manually. " +
      "Create: /workspace/api-server directory, requirements.txt (fastapi, uvicorn[standard], pydantic), " +
      "main.py with a FastAPI app and /health endpoint, routers/ directory, routers/items.py with a sample router. " +
      "Use install_package with manager=pip and cwd=/workspace/api-server to install from requirements.txt. " +
      "Do NOT use any interactive commands.",
  },
  {
    id: "express-server",
    label: "Initialize a Node.js Express Server",
    description: "Scaffold an Express.js server with npm init and folder structure",
    prompt:
      "Initialize a Node.js Express server called express-app by creating files manually. " +
      "Create: /workspace/express-app directory, package.json (with express dep and 'start': 'node src/index.js' script), " +
      "src/ directory, src/index.js with a basic Express app listening on port 3000, " +
      "src/routes/ directory, src/routes/index.js with a sample GET /api/hello route. " +
      "Use install_package with manager=npm and cwd=/workspace/express-app. " +
      "Do NOT use 'npm init' or any interactive commands.",
  },
  {
    id: "fullstack-app",
    label: "Create a Full-Stack App",
    description: "React frontend + FastAPI backend in one shot",
    prompt:
      "Create a full-stack app manually using only create_directory, create_file, write_config, and install_package tools. " +
      "Structure: /workspace/fullstack/ root with /workspace/fullstack/frontend (React: package.json, src/App.jsx, src/main.jsx, index.html, vite.config.js) " +
      "and /workspace/fullstack/backend (FastAPI: requirements.txt, main.py). " +
      "Also create /workspace/fullstack/README.md. " +
      "Do NOT use npm create, npx create-react-app, or any interactive commands.",
  },
];

export const WORKFLOW_EXAMPLES = PREDEFINED_WORKFLOWS.map((w) => ({
  label: w.label,
  prompt: w.prompt,
}));
