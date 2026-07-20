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
BOOTSTRAP_HOST="${BOOTSTRAP_HOST:?Set BOOTSTRAP_HOST to dna-bootstrap.onrender.com}"
PORT="${PORT:-10000}"
BOOTSTRAP_URL="https://${BOOTSTRAP_HOST}/genesis-config"
REPO_ROOT="$(pwd)"
BINARY="${REPO_ROOT}/dnaNode"
DATA_BASE="${DATA_BASE:-/tmp/chain}"

chmod +x "$BINARY"

echo "========================================================"
echo " DNA Network — All-in-One Node Runner"
echo " Bootstrap: $BOOTSTRAP_URL"
echo " Health/RPC port: $PORT"
echo "========================================================"

mkdir -p "$DATA_BASE"

# ── Launch all 5 nodes (localhost P2P — no external networking needed) ────────
start_node() {
  local num=$1 nport=$2 rport=$3 restport=$4 wsport=$5
  local wallet="${REPO_ROOT}/node${num}/wallet.dat"
  local datadir="${DATA_BASE}/node${num}"
  mkdir -p "$datadir"

  echo "[node${num}] Starting on p2p=127.0.0.1:${nport} rpc=${rport} rest=${restport} ws=${wsport}"
  "$BINARY" \
    --config   "$BOOTSTRAP_URL" \
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
