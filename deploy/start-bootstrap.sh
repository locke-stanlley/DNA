#!/usr/bin/env bash
set -euo pipefail

# ─── Bootstrap / Genesis Config Server for Render ─────────────────────────────
# This web service listens on $PORT (Render sets this automatically for web services).
# Nodes connect to this public URL to fetch genesis config.
#
# Peer seed format: "<internal_hostname>:<nodeport>"
# Render private network resolves service names within the same account/env.
# ──────────────────────────────────────────────────────────────────────────────

PORT="${PORT:-8090}"
NODE1_HOST="${NODE1_HOST:-dna-node-1}"
NODE2_HOST="${NODE2_HOST:-dna-node-2}"
NODE3_HOST="${NODE3_HOST:-dna-node-3}"
NODE4_HOST="${NODE4_HOST:-dna-node-4}"
NODE5_HOST="${NODE5_HOST:-dna-node-5}"

SEEDS="${NODE1_HOST}:20338,${NODE2_HOST}:20438,${NODE3_HOST}:20538,${NODE4_HOST}:20638,${NODE5_HOST}:20738"

echo "[bootstrap] DNA Network Bootstrap Server"
echo "[bootstrap] Listening on port: $PORT"
echo "[bootstrap] Peer seeds: $SEEDS"

exec "$(pwd)/dnaNode" bootstrap server \
  --listen "0.0.0.0:${PORT}" \
  --seeds "$SEEDS"
