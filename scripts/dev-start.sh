#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

api_port=5320
web_port=5173
api_pid_file=/tmp/vben-dev-api.pid
web_pid_file=/tmp/vben-dev-web.pid
api_lock=/tmp/vben-dev-api-prepare.lock

read_pid() {
  local file="$1"
  [[ -f "$file" ]] && cat "$file" || true
}

is_pid_alive() {
  local pid="$1"
  [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null
}

stop_owned() {
  local file="$1"
  local pid
  pid="$(read_pid "$file")"
  if is_pid_alive "$pid"; then
    echo "[dev] stopping owned process $pid"
    kill -TERM "$pid" 2>/dev/null || true
    for _ in $(seq 1 30); do
      is_pid_alive "$pid" || break
      sleep 1
    done
    if is_pid_alive "$pid"; then
      kill -KILL "$pid" 2>/dev/null || true
    fi
  fi
  rm -f "$file"
}

wait_forever_while_healthy() {
  local url="$1"
  while curl -fsS --max-time 2 "$url" >/dev/null 2>&1; do sleep 5; done
}

wait_api() {
  for _ in $(seq 1 180); do
    if curl -fsS --max-time 2 "http://127.0.0.1:${api_port}/api/status" >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  echo '[dev] timed out waiting for API health' >&2
  return 1
}

api_start() {
  exec 9>"$api_lock"
  flock 9
  if [[ "${1:-}" == '--force-restart' ]]; then stop_owned "$api_pid_file"; fi
  if curl -fsS --max-time 2 "http://127.0.0.1:${api_port}/api/status" >/dev/null 2>&1; then
    echo "[dev] API already healthy on ${api_port}; reusing it"
    wait_forever_while_healthy "http://127.0.0.1:${api_port}/api/status"
    return 0
  fi
  bash scripts/prepare-runtime.sh
  : "${ACCESS_TOKEN_SECRET:=local-access-secret-change-me-please}"
  : "${REFRESH_TOKEN_SECRET:=local-refresh-secret-change-me-please}"
  : "${INITIAL_ADMIN_PASSWORD:=123456}"
  env ACCESS_TOKEN_SECRET="$ACCESS_TOKEN_SECRET" \
    REFRESH_TOKEN_SECRET="$REFRESH_TOKEN_SECRET" \
    INITIAL_ADMIN_PASSWORD="$INITIAL_ADMIN_PASSWORD" \
    NITRO_HOST=0.0.0.0 NITRO_PORT="$api_port" \
    node apps/server/.output/server/index.mjs &
  local pid=$!
  echo "$pid" > "$api_pid_file"
  trap 'rm -f "$api_pid_file"' EXIT TERM INT
  wait "$pid"
}

web_start() {
  if [[ "${1:-}" == '--force-restart' ]]; then stop_owned "$web_pid_file"; fi
  if curl -fsS --max-time 2 "http://127.0.0.1:${web_port}/" >/dev/null 2>&1; then
    echo "[dev] Web already healthy on ${web_port}; reusing it"
    wait_forever_while_healthy "http://127.0.0.1:${web_port}/"
    return 0
  fi
  wait_api
  if curl -fsS --max-time 2 "http://127.0.0.1:${web_port}/" >/dev/null 2>&1; then
    wait_forever_while_healthy "http://127.0.0.1:${web_port}/"
    return 0
  fi
  pnpm --filter @vben/web-antd exec vite --mode development --host 0.0.0.0 --port "$web_port" --strictPort &
  local pid=$!
  echo "$pid" > "$web_pid_file"
  trap 'rm -f "$web_pid_file"' EXIT TERM INT
  wait "$pid"
}

case "${1:-}" in
  api) api_start "${2:-}" ;;
  web) web_start "${2:-}" ;;
  *) echo "usage: $0 {api|web} [--force-restart]" >&2; exit 2 ;;
esac
