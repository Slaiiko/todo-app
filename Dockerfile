# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-slim AS builder

# better-sqlite3 needs python + build tools for native compilation
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: production ────────────────────────────────────────────────────────
FROM node:22-slim AS runner

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built assets and compiled server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js

# Persistent data lives on the Fly volume mounted at /var/data
ENV DATA_DIR=/var/data
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "server.js"]
