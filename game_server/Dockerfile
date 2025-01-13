FROM node:18-slim

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

ENV NODE_ENV=production
ENV PORT=8000

EXPOSE 8000

# More robust healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD ["curl", "-f", "http://localhost:8000/health", "||", "exit", "1"]

# Use JSON array format for CMD
CMD ["sh", "-c", "echo 'Starting server...' && node physicsServer.js 2>&1 | tee /var/log/app.log"]