#!/usr/bin/env bash
set -euo pipefail

# ─── DNA Validator Node — Render Start Script ─────────────────────────────────
#
# Required environment variables (set in Render dashboard):
#
#   NODE_NUM        : Which node this is: 1, 2, 3, 4, or 5
#   NODE_PORT       : P2P gossip port   (node1=20338 node2=20438 node3=20538 node4=20638 node5=20738)
#   RPC_PORT        : JSON-RPC port     (node1=20336 node2=20436 node3=20536 node4=20636 node5=20736)
#   REST_PORT       : REST API port     (node1=20334 node2=20434 node3=20534 node4=20634 node5=20734)
#   WS_PORT         : WebSocket port    (node1=20335 node2=20435 node3=20535 node4=20635 node5=20735)
#   WALLET_PASSWORD : Wallet decryption password (123456 for test network)
#   BOOTSTRAP_HOST  : Hostname of the bootstrap web service — NO https://, NO trailing slash
#                     e.g.  dna-bootstrap.onrender.com
#
# Optional:
#   DATA_DIR        : Chain data directory (default: /tmp/chain — resets on restart)
#                     Set to /chain-data when using a Render persistent disk
# ─────────────────────────────────────────────────────────────────────────────

NODE_NUM="${NODE_NUM:?Set NODE_NUM to 1, 2, 3, 4, or 5}"
NODE_PORT="${NODE_PORT:?Set NODE_PORT (20338 / 20438 / 20538 / 20638 / 20738)}"
RPC_PORT="${RPC_PORT:?Set RPC_PORT  (20336 / 20436 / 20536 / 20636 / 20736)}"
REST_PORT="${REST_PORT:?Set REST_PORT (20334 / 20434 / 20534 / 20634 / 20734)}"
WS_PORT="${WS_PORT:?Set WS_PORT   (20335 / 20435 / 20535 / 20635 / 20735)}"
WALLET_PASSWORD="${WALLET_PASSWORD:?Set WALLET_PASSWORD}"
BOOTSTRAP_HOST="${BOOTSTRAP_HOST:?Set BOOTSTRAP_HOST to your bootstrap hostname, e.g. dna-bootstrap.onrender.com}"
DATA_DIR="${DATA_DIR:-/tmp/chain}"

REPO_ROOT="$(pwd)"
BINARY="${REPO_ROOT}/dnaNode"
WALLET_FILE="${REPO_ROOT}/node${NODE_NUM}/wallet.dat"

# Genesis config is served by the bootstrap web service at /genesis-config
# Render Web Services are always HTTPS
BOOTSTRAP_URL="https://${BOOTSTRAP_HOST}/genesis-config"

# ── Pre-flight checks ─────────────────────────────────────────────────────────
echo "[node${NODE_NUM}] ============================================"
echo "[node${NODE_NUM}]  DNA Validator Node ${NODE_NUM} — Starting"
echo "[node${NODE_NUM}] ============================================"
echo "[node${NODE_NUM}]  Bootstrap URL : $BOOTSTRAP_URL"
echo "[node${NODE_NUM}]  Wallet file   : $WALLET_FILE"
echo "[node${NODE_NUM}]  Chain data    : $DATA_DIR"
echo "[node${NODE_NUM}]  Ports         : p2p=$NODE_PORT  rpc=$RPC_PORT  rest=$REST_PORT  ws=$WS_PORT"
echo "[node${NODE_NUM}] ─────────────────────────────────────────────"

if [ ! -f "$BINARY" ]; then
  echo "[node${NODE_NUM}] ERROR: dnaNode binary not found at $BINARY"
  echo "  Ensure 'dnaNode' is committed to the root of the repository."
  exit 1
fi

if [ ! -f "$WALLET_FILE" ]; then
  echo "[node${NODE_NUM}] ERROR: Wallet file not found: $WALLET_FILE"
  echo "  Ensure node${NODE_NUM}/wallet.dat is committed to the repository."
  exit 1
fi

# Create data directory if it doesn't exist
mkdir -p "$DATA_DIR"
echo "[node${NODE_NUM}]  Data dir ready: $DATA_DIR"

# Make binary executable (in case git permissions were lost)
chmod +x "$BINARY"

# ── Launch node ───────────────────────────────────────────────────────────────
echo "[node${NODE_NUM}]  Launching dnaNode..."
exec "$BINARY" \
  --config   "$BOOTSTRAP_URL" \
  --data-dir "$DATA_DIR" \
  --wallet   "$WALLET_FILE" \
  --nodeport "$NODE_PORT" \
  --rpcport  "$RPC_PORT" \
  --restport "$REST_PORT" \
  --wsport   "$WS_PORT" \
  --rest \
  --ws \
  --password "$WALLET_PASSWORD" \
  --enable-consensus
