#!/usr/bin/env bash
set -euo pipefail

# ─── DNA Validator Node — Render Start Script ─────────────────────────────────
#
# Runs the DNA node as a Render Web Service (free tier compatible).
# Render assigns a public HTTP port via $PORT — we bind the node's REST API
# to it so Render's health checker sees a live HTTP server.
# P2P gossip uses a fixed internal port and talks to other nodes via
# Render's private network (dna-node-2:20438, etc.)
#
# Required environment variables (set in Render dashboard):
#
#   NODE_NUM        : Which node: 1, 2, 3, 4, or 5
#   NODE_PORT       : Fixed P2P port  (1→20338  2→20438  3→20538  4→20638  5→20738)
#   RPC_PORT        : Fixed RPC port  (1→20336  2→20436  3→20536  4→20636  5→20736)
#   WS_PORT         : Fixed WS port   (1→20335  2→20435  3→20535  4→20635  5→20735)
#   WALLET_PASSWORD : Wallet decryption password
#   BOOTSTRAP_HOST  : Bootstrap hostname — NO https://, NO trailing slash
#                     e.g.  dna-bootstrap.onrender.com
#
# Provided automatically by Render:
#   PORT            : Public HTTP port Render assigns — mapped to --restport
#
# Optional:
#   DATA_DIR        : Chain data dir (default: /tmp/chain)
#                     Set /chain-data when using a persistent disk (paid plan)
# ─────────────────────────────────────────────────────────────────────────────

NODE_NUM="${NODE_NUM:?Set NODE_NUM to 1, 2, 3, 4, or 5}"
NODE_PORT="${NODE_PORT:?Set NODE_PORT  (1→20338 2→20438 3→20538 4→20638 5→20738)}"
RPC_PORT="${RPC_PORT:?Set RPC_PORT   (1→20336 2→20436 3→20536 4→20636 5→20736)}"
WS_PORT="${WS_PORT:?Set WS_PORT    (1→20335 2→20435 3→20535 4→20635 5→20735)}"
WALLET_PASSWORD="${WALLET_PASSWORD:?Set WALLET_PASSWORD}"
BOOTSTRAP_HOST="${BOOTSTRAP_HOST:?Set BOOTSTRAP_HOST, e.g. dna-bootstrap.onrender.com}"
DATA_DIR="${DATA_DIR:-/tmp/chain}"

# Render injects $PORT for web services — bind REST API to it
REST_PORT="${PORT:-20334}"

REPO_ROOT="$(pwd)"
BINARY="${REPO_ROOT}/dnaNode"
WALLET_FILE="${REPO_ROOT}/node${NODE_NUM}/wallet.dat"
BOOTSTRAP_URL="https://${BOOTSTRAP_HOST}/genesis-config"

# ── Pre-flight checks ─────────────────────────────────────────────────────────
echo "[node${NODE_NUM}] ============================================"
echo "[node${NODE_NUM}]  DNA Validator Node ${NODE_NUM} — Starting"
echo "[node${NODE_NUM}] ============================================"
echo "[node${NODE_NUM}]  Bootstrap URL : $BOOTSTRAP_URL"
echo "[node${NODE_NUM}]  Wallet file   : $WALLET_FILE"
echo "[node${NODE_NUM}]  Chain data    : $DATA_DIR"
echo "[node${NODE_NUM}]  Ports → p2p=$NODE_PORT  rpc=$RPC_PORT  rest(public)=$REST_PORT  ws=$WS_PORT"
echo "[node${NODE_NUM}] ─────────────────────────────────────────────"

if [ ! -f "$BINARY" ]; then
  echo "[node${NODE_NUM}] ERROR: dnaNode binary not found at $BINARY"
  echo "  Ensure 'dnaNode' is committed to the root of the repository."
  exit 1
fi

if [ ! -f "$WALLET_FILE" ]; then
  echo "[node${NODE_NUM}] ERROR: Wallet not found: $WALLET_FILE"
  echo "  Ensure node${NODE_NUM}/wallet.dat is committed to the repository."
  exit 1
fi

mkdir -p "$DATA_DIR"
chmod +x "$BINARY"

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
