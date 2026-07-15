#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BIN="$ROOT_DIR/dnaNode"
CONFIG_SRC="$ROOT_DIR/config.json"
PASSWORD="${DNA_WALLET_PASSWORD:-123456}"

if [[ ! -x "$BIN" ]]; then
  echo "dnaNode binary not found at $BIN. Please run 'make' first." >&2
  exit 1
fi

echo "Stopping any previous local test nodes..."
pkill -f "dnaNode --config config.json" >/dev/null 2>&1 || true
pkill -f "dnaNode bootstrap server" >/dev/null 2>&1 || true
sleep 1

BOOTSTRAP_LISTEN="${DNA_BOOTSTRAP_LISTEN:-0.0.0.0:8090}"
BOOTSTRAP_URL="${DNA_BOOTSTRAP_URL:-http://127.0.0.1:8090}"
BOOTSTRAP_SEEDS="127.0.0.1:20338,127.0.0.1:20438,127.0.0.1:20538,127.0.0.1:20638"

echo "Starting HTTP bootstrap server on ${BOOTSTRAP_LISTEN}..."
nohup "$BIN" bootstrap server \
  --listen "$BOOTSTRAP_LISTEN" \
  --seeds "$BOOTSTRAP_SEEDS" > "$ROOT_DIR/bootstrap.log" 2>&1 &
sleep 1

for i in 1 2 3 4; do
  dir="$ROOT_DIR/node${i}"
  mkdir -p "$dir"
  rm -rf "$dir/Chain" "$dir/node.log" "$dir/wallet.dat" "$dir/dnaNode"
  install -m 0755 "$BIN" "$dir/dnaNode"
  cp "$CONFIG_SRC" "$dir/config.json"
done

for i in 1 2 3 4; do
  dir="$ROOT_DIR/node${i}"
  echo "Creating wallet for node${i}..."
  printf '%s\n%s\n' "$PASSWORD" "$PASSWORD" | "$BIN" account add -d --wallet "$dir/wallet.dat" >/dev/null 2>&1 || true
done

for i in 1 2 3 4; do
  python3 - <<'PY' "$ROOT_DIR/node${i}/config.json"
import json
import os
import sys
path = sys.argv[1]
with open(path) as f:
    data = json.load(f)
if 'SeedList' in data:
    data['SeedList'] = [
        '127.0.0.1:20338',
        '127.0.0.1:20438',
        '127.0.0.1:20538',
        '127.0.0.1:20638',
    ]
if 'P2PNode' not in data:
    data['P2PNode'] = {}
data['P2PNode']['HttpBootstrapServer'] = os.environ.get('DNA_BOOTSTRAP_URL', 'http://127.0.0.1:8090')
with open(path, 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
PY
  echo "Configured node${i}"
done

start_node() {
  local idx="$1"
  local nodeport="$2"
  local rpcport="$3"
  local restport="$4"
  local wsport="$5"
  local dir="$ROOT_DIR/node${idx}"

  (
    cd "$dir"
    nohup ./dnaNode \
      --config config.json \
      --data-dir Chain \
      --wallet wallet.dat \
      --password "$PASSWORD" \
      --enable-consensus \
      --rest \
      --ws \
      --nodeport "$nodeport" \
      --rpcport "$rpcport" \
      --restport "$restport" \
      --wsport "$wsport" > "$dir/node.log" 2>&1 &
  )
}

start_node 1 20338 20336 20334 20335
start_node 2 20438 20436 20434 20435
start_node 3 20538 20536 20534 20535
start_node 4 20638 20636 20634 20635

sleep 5

echo "Nodes started. Logs are in:"
for i in 1 2 3 4; do
  echo "  - $ROOT_DIR/node${i}/node.log"
done

echo
for rpcport in 20336 20436 20536 20636; do
  echo "Waiting for RPC on port $rpcport..."
  ready=0
  for attempt in $(seq 1 30); do
    if "$BIN" info curblockheight --rpcport "$rpcport" >/tmp/dna-rpc-check.txt 2>&1; then
      ready=1
      break
    fi
    sleep 1
  done
  if [[ $ready -eq 1 ]]; then
    cat /tmp/dna-rpc-check.txt
  else
    echo "RPC on port $rpcport did not become ready in time."
    cat /tmp/dna-rpc-check.txt || true
  fi
  echo
 done

echo "To stop all nodes, run:"
echo "  pkill -f 'dnaNode --config config.json' || true"
echo "  pkill -f 'dnaNode bootstrap server' || true"
echo
echo "Bootstrap server: ${BOOTSTRAP_URL} (log: $ROOT_DIR/bootstrap.log)"
echo "  curl -s ${BOOTSTRAP_URL}/peers | jq ."
echo "  curl -s ${BOOTSTRAP_URL}/status | jq ."
