#!/usr/bin/env bash
set -euo pipefail

# ─── Required environment variables ───────────────────────────────────────────
# NODE_NUM          : 1..5  (which node this is)
# NODE_PORT         : p2p port
# RPC_PORT          : JSON-RPC port
# REST_PORT         : REST port
# WS_PORT           : WebSocket port
# WALLET_PASSWORD   : wallet decryption password
# BOOTSTRAP_HOST    : hostname of the bootstrap web service (set by Render)
# BOOTSTRAP_PORT    : bootstrap server port (default 8090)
# DATA_DIR          : where to store chain data (default /chain-data for Render disk)
# ──────────────────────────────────────────────────────────────────────────────

NODE_NUM="${NODE_NUM:?NODE_NUM must be set (1-5)}"
NODE_PORT="${NODE_PORT:?NODE_PORT must be set}"
RPC_PORT="${RPC_PORT:?RPC_PORT must be set}"
REST_PORT="${REST_PORT:?REST_PORT must be set}"
WS_PORT="${WS_PORT:?WS_PORT must be set}"
WALLET_PASSWORD="${WALLET_PASSWORD:?WALLET_PASSWORD must be set}"
BOOTSTRAP_HOST="${BOOTSTRAP_HOST:?BOOTSTRAP_HOST must be set (e.g. dna-bootstrap.onrender.com)}"
BOOTSTRAP_PORT="${BOOTSTRAP_PORT:-8090}"
DATA_DIR="${DATA_DIR:-/tmp/chain}"

# Full genesis config URL — the bootstrap web service serves this at /genesis-config
# Use https:// since the bootstrap is a Render Web Service (always HTTPS on Render)
BOOTSTRAP_URL="https://${BOOTSTRAP_HOST}/genesis-config"

# Repo root is the CWD when Render runs the startCommand
REPO_ROOT="$(pwd)"
WALLET_FILE="${REPO_ROOT}/node${NODE_NUM}/wallet.dat"

echo "[node${NODE_NUM}] Starting DNA validator node..."
echo "[node${NODE_NUM}] Bootstrap URL: $BOOTSTRAP_URL"
echo "[node${NODE_NUM}] Wallet: $WALLET_FILE"
echo "[node${NODE_NUM}] Data dir: $DATA_DIR"
echo "[node${NODE_NUM}] Ports: node=$NODE_PORT rpc=$RPC_PORT rest=$REST_PORT ws=$WS_PORT"

if [ ! -f "$WALLET_FILE" ]; then
  echo "[node${NODE_NUM}] ERROR: Wallet file not found: $WALLET_FILE"
  echo "  Make sure node${NODE_NUM}/wallet.dat is committed to the repository."
  exit 1
fi

exec "${REPO_ROOT}/dnaNode" \
  --config "$BOOTSTRAP_URL" \
  --data-dir "$DATA_DIR" \
  --wallet "$WALLET_FILE" \
  --nodeport "$NODE_PORT" \
  --rpcport "$RPC_PORT" \
  --restport "$REST_PORT" \
  --wsport "$WS_PORT" \
  --rest \
  --ws \
  --password "$WALLET_PASSWORD" \
  --enable-consensus
