#!/usr/bin/env bash
set -euo pipefail
# ─── DNA Network — All-in-One Render Start Script ────────────────────────────
# Runs all 5 validator nodes as background processes inside one Render Web Service.
# Nodes talk to each other on localhost — no private networking needed.
# A tiny Python health server listens on Render's $PORT for HTTP health checks.
#
# Required env vars (set in Render dashboard):
#   WALLET_PASSWORD   : password for all node wallets (default: 123456)
#   BOOTSTRAP_HOST    : bootstrap service hostname (dna-bootstrap.onrender.com)
#   PORT              : injected by Render — used for the health/RPC HTTP endpoint
# ─────────────────────────────────────────────────────────────────────────────

WALLET_PASSWORD="${WALLET_PASSWORD:-123456}"
PORT="${PORT:-10000}"
REPO_ROOT="$(pwd)"
BINARY="${REPO_ROOT}/dnaNode"
DATA_BASE="${DATA_BASE:-/tmp/chain}"

chmod +x "$BINARY"

echo "========================================================"
echo " DNA Network — All-in-One Node Runner"
echo " Health/RPC port: $PORT"
echo "========================================================"

mkdir -p "$DATA_BASE"

# Generate a clean local config with all 5 nodes on localhost
cat << 'EOF' > "$DATA_BASE/config.json"
{
  "SeedList": [
    "127.0.0.1:20338", "127.0.0.1:20438", "127.0.0.1:20538", "127.0.0.1:20638", "127.0.0.1:20738"
  ],
  "ConsensusType": "vbft",
  "VBFT": {
    "n": 5, "c": 1, "k": 5, "l": 80,
    "block_msg_delay": 10000, "hash_msg_delay": 10000, "peer_handshake_timeout": 10, "max_block_change_view": 3000,
    "admin_ont_id": "did:dna:AMAx993nE6NEqZjwBssUfopxnnvTdob9ij", "min_init_stake": 10000,
    "vrf_value": "1c9810aa9822e511d5804a9c4db9dd08497c31087b0daafa34d768a3253441fa20515e2f30f81741102af0ca3cefc4818fef16adb825fbaa8cad78647f3afb590e",
    "vrf_proof": "c57741f934042cb8d8b087b44b161db56fc3ffd4ffb675d36cd09f83935be853d8729f3f5298d12d6fd28d45dde515a4b9d7f67682d182ba5118abf451ff1988",
    "peers": [
      {"index": 1, "peerPubkey": "03603f114619cd06c1d04142d2c00a10e8fb3a668245b8105b5c095bf26cd8edde", "address": "AX3LEE3rUhinSjcyW5R6Cz6NZZKA16RTMM", "initPos": 10000},
      {"index": 2, "peerPubkey": "02f86ca933f69c4109ea936dff7d8507e41618500dbd376dd72e011afa6ac577be", "address": "ASsynsUiDCmdGSbAMXgyz6uGDc4EKYpuao", "initPos": 10000},
      {"index": 3, "peerPubkey": "0314556d5690d073d4699d719108b583c72be2c30bda56bbfdd58e21f261cd8ec7", "address": "ARu8bPLsFFgTzUJHs2i8xN5bp6aVF5TnfY", "initPos": 10000},
      {"index": 4, "peerPubkey": "03929c5ceef5e5211910e04ae309c1b623fcb9b118ebb482cf0d02c028d3ec3a57", "address": "AdQ9w5GTmjDGCyWAAwhusNaTnCzcnqgf4k", "initPos": 10000},
      {"index": 5, "peerPubkey": "03e4ca87bb7170539c76a6da64900c960f37946e436802b7ba7f69e170c333f3b4", "address": "AdLxFR53J7MGDv1LdfLzxGXpqQZ4xoY1qS", "initPos": 10000}
    ]
  }
}
EOF

# ── Launch all 5 nodes (localhost P2P — no external networking needed) ────────
start_node() {
  local num=$1 nport=$2 rport=$3 restport=$4 wsport=$5
  local wallet="${REPO_ROOT}/node${num}/wallet.dat"
  local datadir="${DATA_BASE}/node${num}"
  mkdir -p "$datadir"

  echo "[node${num}] Starting on p2p=127.0.0.1:${nport} rpc=${rport} rest=${restport} ws=${wsport}"
  "$BINARY" \
    --config   "$DATA_BASE/config.json" \
    --data-dir "$datadir" \
    --wallet   "$wallet" \
    --nodeport "$nport" \
    --rpcport  "$rport" \
    --restport "$restport" \
    --wsport   "$wsport" \
    --rest \
    --ws \
    --password "$WALLET_PASSWORD" \
    --enable-consensus \
    >> "${DATA_BASE}/node${num}.log" 2>&1 &

  echo "[node${num}] PID $!"
}

#          num  p2p    rpc    rest   ws
start_node  1  20338  20336  20334  20335
sleep 1
start_node  2  20438  20436  20434  20435
sleep 1
start_node  3  20538  20536  20534  20535
sleep 1
start_node  4  20638  20636  20634  20635
sleep 1
start_node  5  20738  20736  20734  20735
sleep 2

echo "All 5 nodes launched."

# ── Health + RPC forwarder — serves on Render's $PORT ─────────────────────────
# Forwards JSON-RPC to node 1, and exposes /health and /logs endpoints.
python3 - <<PYEOF
import http.server, urllib.request, json, os, threading, time, subprocess

PORT = int(os.environ.get("PORT", 10000))
DATA_BASE = os.environ.get("DATA_BASE", "/tmp/chain")

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # suppress access logs

    def do_GET(self):
        if self.path == "/health" or self.path == "/":
            self._respond(200, {"status": "ok", "nodes": 5})
        elif self.path.startswith("/logs/"):
            node = self.path.split("/")[-1]
            logfile = f"{DATA_BASE}/node{node}.log"
            try:
                with open(logfile) as f:
                    lines = f.readlines()[-100:]
                self.send_response(200)
                self.send_header("Content-Type", "text/plain")
                self.end_headers()
                self.wfile.write("".join(lines).encode())
            except FileNotFoundError:
                self._respond(404, {"error": f"log for node {node} not found"})
        elif self.path == "/rpc/blockcount":
            try:
                body = json.dumps({"jsonrpc":"2.0","method":"getblockcount","params":[],"id":1}).encode()
                req = urllib.request.Request("http://127.0.0.1:20336",
                    data=body, headers={"Content-Type":"application/json"})
                with urllib.request.urlopen(req, timeout=3) as r:
                    result = json.loads(r.read())
                self._respond(200, result)
            except Exception as e:
                self._respond(503, {"error": str(e)})
        else:
            self._respond(404, {"error": "not found"})

    def do_POST(self):
        # Proxy all POST requests to node 1's JSON-RPC
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        try:
            req = urllib.request.Request("http://127.0.0.1:20336",
                data=body, headers={"Content-Type":"application/json"})
            with urllib.request.urlopen(req, timeout=5) as r:
                resp = r.read()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(resp)
        except Exception as e:
            self._respond(503, {"error": str(e)})

    def _respond(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

print(f"[health] Listening on 0.0.0.0:{PORT}")
print(f"[health] Endpoints: GET /health  GET /rpc/blockcount  GET /logs/<1-5>  POST / (JSON-RPC proxy)")
server = http.server.HTTPServer(("0.0.0.0", PORT), Handler)
server.serve_forever()
PYEOF
