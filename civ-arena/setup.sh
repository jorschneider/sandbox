#!/usr/bin/env bash
# Stand up the CivAgent headless self-play stack.
#
# Clones CivAgent (the active "moved" repo), creates a venv with the validated
# dependency pins, ensures Redis is reachable, and runs the no-keys engine
# smoke test. Idempotent: re-running skips work already done.
set -euo pipefail
cd "$(dirname "$0")"

CIVAGENT_REPO="${CIVAGENT_REPO:-https://github.com/asdqsczser/CivAgent.git}"
CIVAGENT_DIR="$(pwd)/vendor/CivAgent"
REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${REDIS_PORT:-6379}"

echo "==> Checking prerequisites"
command -v java >/dev/null || { echo "Java 17+ required (runs Unciv.jar). Install a JDK."; exit 1; }
command -v python3 >/dev/null || { echo "Python 3.10+ required."; exit 1; }
command -v redis-server >/dev/null || echo "  (warn) redis-server not found; install Redis or point REDIS_HOST/REDIS_PORT at one."

echo "==> Cloning CivAgent -> vendor/CivAgent"
if [ ! -d "$CIVAGENT_DIR/.git" ]; then
  mkdir -p vendor
  git clone --depth 1 "$CIVAGENT_REPO" "$CIVAGENT_DIR"
else
  echo "  already present"
fi
[ -f "$CIVAGENT_DIR/resources/Unciv.jar" ] || { echo "Unciv.jar missing from checkout."; exit 1; }

echo "==> Python venv + dependencies"
if [ ! -d .venv ]; then python3 -m venv .venv; fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt

echo "==> Redis"
if command -v redis-cli >/dev/null && redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping >/dev/null 2>&1; then
  echo "  reachable at $REDIS_HOST:$REDIS_PORT"
elif command -v redis-server >/dev/null; then
  echo "  starting local redis-server"
  redis-server --daemonize yes --appendonly no >/dev/null 2>&1 || true
  sleep 1
  redis-cli ping >/dev/null 2>&1 && echo "  ok" || echo "  (warn) could not confirm redis"
fi

# CivAgent reads Redis host/port from its config at import time; make sure the
# checkout's config.yaml points somewhere reachable (arena.py overrides this at
# runtime, but smoke_test.py imports against the checkout's config).
python3 - "$CIVAGENT_DIR/config.yaml" "$REDIS_HOST" "$REDIS_PORT" <<'PY'
import sys, yaml
path, host, port = sys.argv[1], sys.argv[2], int(sys.argv[3])
with open(path) as f: c = yaml.safe_load(f) or {}
c.setdefault("Redis", {}).update({"host": host, "port": port, "db": 0, "password": None})
with open(path, "w") as f: yaml.safe_dump(c, f)
print("  patched", path)
PY

echo "==> Smoke test (headless engine, no API keys)"
CIVAGENT_DIR="$CIVAGENT_DIR" python3 smoke_test.py

cat <<EOF

Setup complete.
  Activate venv:   source .venv/bin/activate
  Dry-run a match: CIVAGENT_DIR=$CIVAGENT_DIR python arena.py --dry-run --rounds 3
  Live match:      cp models.example.yaml models.yaml  (add API keys, pick models)
                   CIVAGENT_DIR=$CIVAGENT_DIR python arena.py --rounds 8
EOF
