#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

ready_file=/tmp/vben-runtime-ready
persistent_ready_file=data/.runtime-ready

for _ in $(seq 1 180); do
  if [[ -f "$persistent_ready_file" && -x apps/web-antd/node_modules/.bin/vite && -x apps/web-antd/node_modules/.bin/vue-tsc && -e packages/utils/node_modules/@vben-core/shared && -f internal/vite-config/dist/index.mjs && -f packages/@core/base/shared/dist/cache/index.mjs && -f apps/server/.output/server/index.mjs ]] && node scripts/verify-workspace-links.mjs >/dev/null 2>&1; then
    touch "$ready_file"
    exit 0
  fi
  sleep 2
done

echo '[runtime] timed out waiting for the shared dependency/database preparation' >&2
exit 1
