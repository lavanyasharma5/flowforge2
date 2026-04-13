# orchestrator/Dockerfile
FROM node:20-slim

# curl needed for Docker healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy source
COPY src/ ./src/

ENV PORT=3001
ENV MCP_SERVER_URL=http://mcp-server:8000
ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "src/index.js"]
