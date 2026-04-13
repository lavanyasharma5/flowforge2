FROM node:20-alpine

# Install base tools for sandbox execution
RUN apk add --no-cache \
    bash \
    curl \
    git \
    python3 \
    py3-pip \
    make \
    g++ \
    && npm install -g create-react-app create-vite

WORKDIR /workspace

# Create a non-root user for extra safety
RUN addgroup -S sandboxuser && adduser -S sandboxuser -G sandboxuser
RUN chown -R sandboxuser:sandboxuser /workspace

USER sandboxuser

CMD ["tail", "-f", "/dev/null"]
