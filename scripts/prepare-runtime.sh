#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

runtime_lock=/tmp/vben-runtime-install.lock
ready_file=/tmp/vben-runtime-ready
persistent_ready_file=data/.runtime-ready

# One process owns the whole recovery lifecycle. In particular, PGlite must
# never be opened by two migration processes at the same time.
exec 9>"$runtime_lock"
flock 9

if [[ -f "$persistent_ready_file" && -f "$ready_file" && -f data/.migration-complete && -x apps/web-antd/node_modules/.bin/vite && -x apps/web-antd/node_modules/.bin/vue-tsc && -x apps/server/node_modules/.bin/nitro && -f internal/vite-config/dist/index.mjs && -f packages/@core/base/shared/dist/cache/index.mjs && -f apps/server/.output/server/index.mjs ]]; then
  if node scripts/verify-workspace-links.mjs >/dev/null 2>&1; then
    mkdir -p data/uploads/contracts data/uploads/invoices data/uploads/employee-contracts
    touch data/.migration-complete
    exit 0
  fi
fi

rm -f "$ready_file"
node scripts/ensure-workspace-packages.mjs

if [[ ! -x apps/web-antd/node_modules/.bin/vite || ! -x apps/web-antd/node_modules/.bin/vue-tsc || ! -x apps/server/node_modules/.bin/nitro || ! -e packages/utils/node_modules/@vben-core/shared || ! -f internal/vite-config/dist/index.mjs || ! -f packages/@core/base/shared/dist/cache/index.mjs ]]; then
  pnpm install --filter @vben/web-antd... --filter @vben/server... --filter @vben/node-utils... --filter @vben/vite-config... --filter @vben/eslint-config... --filter @vben-core/shared... --ignore-scripts --network-concurrency=1 --child-concurrency=1
  pnpm --filter @vben/node-utils run stub
  pnpm --filter @vben/vite-config run stub
  pnpm --filter @vben/eslint-config run stub
  pnpm --filter @vben-core/shared run stub
fi

node scripts/verify-workspace-links.mjs

mkdir -p data/pg
# A sandbox kill can leave PGlite's PostgreSQL-style lock file behind. Only
# remove it when it does not describe a live process; never touch an active DB.
if [[ -f data/pg/postmaster.pid ]]; then
  db_pid=$(head -n 1 data/pg/postmaster.pid || true)
  if [[ ! "$db_pid" =~ ^[0-9]+$ ]] || ! kill -0 "$db_pid" 2>/dev/null; then
    rm -f data/pg/postmaster.pid
  fi
fi
# The lock is held for migration as well as installation/build, so no other
# API or platform prepare job can open the PGlite directory concurrently.
# Do not migrate on every Web restart: the API may already have this database
# open, and a second PGlite opener can corrupt or block the directory.
if [[ ! -f data/.migration-complete ]]; then
  pnpm --filter @vben/server run migrate
  touch data/.migration-complete
fi
# Keep file-backed attachments on the same persisted volume as the database.
# They are intentionally not stored inside PGlite and must survive restarts.
mkdir -p data/uploads/contracts data/uploads/invoices data/uploads/employee-contracts
if [[ ! -f apps/server/.output/server/index.mjs ]]; then
  pnpm --filter @vben/server run build
fi

if [[ ! -x apps/web-antd/node_modules/.bin/vue-tsc ]]; then
  echo '[runtime] vue-tsc is missing after dependency recovery' >&2
  exit 1
fi
touch "$persistent_ready_file"
touch "$ready_file"
