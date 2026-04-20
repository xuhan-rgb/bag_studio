#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="${XDG_RUNTIME_DIR:-/tmp}/bag_studio_live"
PID_FILE="$RUNTIME_DIR/server.pid"
LOG_FILE="$RUNTIME_DIR/server.log"

mkdir -p "$RUNTIME_DIR"
cd "$SCRIPT_DIR"

# 启动前探测 ROS2 Humble。**默认 fail-fast**：探测失败直接拒绝启动。
echo "[start.sh] probing ROS2 Humble in current shell..."
PROBE_EXIT=0
python3 runner.py || PROBE_EXIT=$?
if [[ "$PROBE_EXIT" -ne 0 ]]; then
  echo "[start.sh] ROS2 探测失败（exit=$PROBE_EXIT），已终止启动。"
  echo "[start.sh] 请在当前 shell 里 source /opt/ros/humble/setup.bash，再 python3 runner.py 验证，然后重新 bash start.sh。"
  exit "$PROBE_EXIT"
fi

if [[ -f "$PID_FILE" ]]; then
  EXISTING_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "${EXISTING_PID:-}" ]] && kill -0 "$EXISTING_PID" 2>/dev/null; then
    echo "Bag Studio already running."
    echo "- PID: $EXISTING_PID"
    echo "- URL: http://127.0.0.1:18081"
    echo "- Log: $LOG_FILE"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

nohup env LANG=C.UTF-8 LC_ALL=C.UTF-8 PYTHONIOENCODING=UTF-8 \
  python3 server.py >"$LOG_FILE" 2>&1 < /dev/null &
SERVER_PID=$!
disown "$SERVER_PID" 2>/dev/null || true
echo "$SERVER_PID" > "$PID_FILE"

sleep 0.6
if kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "Bag Studio started."
  echo "- PID: $SERVER_PID"
  echo "- URL: http://127.0.0.1:18081"
  echo "- Log: $LOG_FILE"
  exit 0
fi

echo "Bag Studio failed to start."
echo "- Log: $LOG_FILE"
tail -n 40 "$LOG_FILE" 2>/dev/null || true
rm -f "$PID_FILE"
exit 1
