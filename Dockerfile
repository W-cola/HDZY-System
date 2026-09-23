FROM node:22-slim AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /app
COPY . .
# 发布平台可能过滤顶层 packages；构建前从明确持久化的普通源码备份恢复。
RUN if [ ! -f packages/effects/access/package.json ]; then \
      test -f internal/vendor-vben/effects/access/package.json && \
      rm -rf packages && cp -a internal/vendor-vben packages; \
    fi
RUN test -f packages/effects/access/package.json
# Full install (no --filter) so every workspace package gets its dependency
# links and dist stubs built; the filtered install silently omits nested
# workspace deps (e.g. @vben-core/preferences) and breaks production build.
RUN pnpm install --frozen-lockfile
RUN corepack pnpm -r run --if-present stub
RUN echo '=== DIAG packages ===' && (ls packages >/dev/null 2>&1 && echo 'packages-dir-present' || echo 'packages-dir-MISSING') && ls packages 2>/dev/null | head && echo '--- web-antd @vben links ---' && ls -la apps/web-antd/node_modules/@vben/preferences 2>&1 && echo '--- resolve test ---' && (cd apps/web-antd && node -e "import('@vben/preferences').then(()=>console.log('RESOLVE-OK')).catch(e=>console.log('RESOLVE-FAIL',e.message))")
RUN pnpm --filter @vben/web-antd run build
RUN pnpm --filter @vben/server run build
RUN rm -rf apps/server/.output/public/* && cp -R apps/web-antd/dist/. apps/server/.output/public/

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=5320
COPY --from=builder /app/apps/server/.output ./apps/server/.output
COPY --from=builder /app/apps/server/scripts ./apps/server/scripts
COPY --from=builder /app/apps/server/db ./apps/server/db
# migrate.mjs 在启动时直接运行，需要保留 pnpm 的数据库驱动及其链接。
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules
# 首次上线或数据库结构升级时，先安全执行幂等迁移，再启动 API。
EXPOSE 5320
CMD ["sh", "-c", "cd /app/apps/server && node scripts/migrate.mjs && cd /app && exec node apps/server/.output/server/index.mjs"]
