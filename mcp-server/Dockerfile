# mcp-server/Dockerfile
FROM docker:cli AS docker_cli

FROM python:3.12-slim

WORKDIR /app

COPY --from=docker_cli /usr/local/bin/docker /usr/local/bin/

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY *.py ./

# Create data directory for SQLite
RUN mkdir -p /app/data

ENV SANDBOX_MODE=simulated
ENV DB_PATH=/app/data/audit.db
ENV SIMULATED_ROOT=/tmp/operon-sandbox

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "info"]
