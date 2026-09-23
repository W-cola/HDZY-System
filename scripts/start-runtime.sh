#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

api_port=5320
api_lock=/tmp/vben-api-instance.lock

if [[ "$1" == "api" ]]; then
  # The platform may restore an already-running API and then replay this
  # command. Reuse that instance instead of creating a second listener.
  if curl -fsS --max-time 2 "http://127.0.0.1:${api_port}/api/status" >/dev/null 2>&1; then
    echo "[runtime] API already healthy on ${api_port}; reusing existing instance"
    exit 0
  fi
  # Keep this descriptor locked for the whole API lifetime. A replayed start
  # command must not open the same PGlite directory while the first API is
  # still initializing (before its HTTP health endpoint is available).
  exec 8>"$api_lock"
  if ! flock -n 8; then
    echo '[runtime] another API instance owns the PGlite database; waiting for health'
    for _ in $(seq 1 60); do
      if curl -fsS --max-time 2 "http://127.0.0.1:${api_port}/api/status" >/dev/null 2>&1; then
        echo "[runtime] existing API is healthy on ${api_port}"
        exit 0
      fi
      sleep 1
    done
    echo '[runtime] API lock is held but no healthy API appeared' >&2
    exit 1
  fi
  bash scripts/prepare-runtime.sh
  if curl -fsS --max-time 2 "http://127.0.0.1:${api_port}/api/status" >/dev/null 2>&1; then
    echo "[runtime] API became healthy during preparation; reusing existing instance"
    exit 0
  fi
  # Local sandbox runs the production Nitro bundle, so explicitly provide
  # non-default development secrets without weakening production validation.
  : "${ACCESS_TOKEN_SECRET:=local-access-secret-change-me-please}"
  : "${REFRESH_TOKEN_SECRET:=local-refresh-secret-change-me-please}"
  exec env ACCESS_TOKEN_SECRET="$ACCESS_TOKEN_SECRET" REFRESH_TOKEN_SECRET="$REFRESH_TOKEN_SECRET" NITRO_HOST=0.0.0.0 NITRO_PORT="$api_port" node apps/server/.output/server/index.mjs
fi

# API and Web are started in parallel by the platform. Do not let Web run
# prepare-runtime while API is building the Nitro output, otherwise the Web
# process can delete/rebuild apps/server/.output between API preparation and
# its final node exec, producing MODULE_NOT_FOUND or stale-code behavior.
api_ready=false
for _ in $(seq 1 120); do
  if curl -fsS --max-time 2 "http://127.0.0.1:${api_port}/api/status" >/dev/null 2>&1; then
    api_ready=true
    break
  fi
  sleep 1
done
if [[ "$api_ready" != true ]]; then
  bash scripts/prepare-runtime.sh
  bash scripts/wait-runtime.sh
fi
# Refuse Vite's automatic port fallback: the preview proxy always targets 5173,
# so silently starting on 5174 would leave users connected to a stale instance.
exec pnpm --filter @vben/web-antd exec vite --mode development --host 0.0.0.0 --port 5173 --strictPort
