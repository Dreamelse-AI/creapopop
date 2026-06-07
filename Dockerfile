# ── Stage 1: Build ──
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /build
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# ── Stage 2: Runtime ──
FROM node:22-alpine
WORKDIR /app

COPY --from=builder /build/package.json /build/pnpm-lock.yaml /build/.npmrc ./
RUN corepack enable && corepack prepare pnpm@latest --activate \
    && pnpm install --prod --frozen-lockfile \
    && rm -rf /root/.local/share/pnpm/store
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/server.cjs ./server.cjs
COPY --from=builder /build/server ./server

# 持久化目录（本地 JSON 存储兜底 + secrets 挂载点）
RUN mkdir -p /app/.data /app/secrets

EXPOSE 9527

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:9527/health || exit 1

CMD ["node", "server.cjs"]
