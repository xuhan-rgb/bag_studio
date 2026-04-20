#!/usr/bin/env bash
set -euo pipefail

RUNTIME_DIR="${XDG_RUNTIME_DIR:-/tmp}/bag_studio_live"
PID_FILE="$RUNTIME_DIR/server.pid"

echo "Stopping bag_studio..."
HOST_STOPPED=0

if [[ -f "$PID_FILE" ]]; then
  SERVER_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    sleep 0.3
    if kill -0 "$SERVER_PID" 2>/dev/null; then
      kill -9 "$SERVER_PID" 2>/dev/null || true
    fi
    HOST_STOPPED=1
    echo "Host server stopped (PID $SERVER_PID)"
  fi
  rm -f "$PID_FILE"
fi

mapfile -t PORT_PIDS < <(lsof -ti:18081 2>/dev/null || true)
if ((${#PORT_PIDS[@]})); then
  kill "${PORT_PIDS[@]}" 2>/dev/null || true
  sleep 0.3
  mapfile -t REMAINING_PIDS < <(lsof -ti:18081 2>/dev/null || true)
  if ((${#REMAINING_PIDS[@]})); then
    kill -9 "${REMAINING_PIDS[@]}" 2>/dev/null || true
  fi
  HOST_STOPPED=1
  echo "Host port 18081 cleared"
fi

if [[ "$HOST_STOPPED" -eq 0 ]]; then
  echo "No running bag_studio server found."
fi

echo "Done."
