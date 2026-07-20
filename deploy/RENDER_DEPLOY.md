# DNA Network — Render Deployment Guide

## Why One Service for All Nodes

Render's free tier has two blockers for running nodes as separate services:
- **No private DNS** — `dna-node-1`, `dna-node-2` etc. don't resolve between free services
- **No raw TCP routing** — DNA's P2P uses raw TCP; Render's proxy only speaks HTTP/HTTPS

**Solution**: Run all 5 validator nodes as background processes inside **one Render Web Service**.
They talk to each other over `127.0.0.1` (localhost) — no private networking needed.
A lightweight Python HTTP server on Render's `$PORT` handles health checks and RPC.

```
  Internet
     │
     ▼  HTTPS (public)
┌────────────────────────────────────────────────────────┐
│  dna-network  (ONE Render Web Service — free tier)     │
│                                                        │
│  Python health server (:$PORT)  ← Render health check │
│    GET /health          → {"status":"ok","nodes":5}    │
│    GET /rpc/blockcount  → block height of node 1       │
│    GET /logs/<1-5>      → last 100 lines of node log   │
│    POST /               → JSON-RPC proxy to node 1     │
│                                                        │
│  node 1  p2p=127.0.0.1:20338  rpc=20336               │
│  node 2  p2p=127.0.0.1:20438  rpc=20436  ◀────────┐   │
│  node 3  p2p=127.0.0.1:20538  rpc=20536  ◀────┐   │   │
│  node 4  p2p=127.0.0.1:20638  rpc=20636       │   │   │
│  node 5  p2p=127.0.0.1:20738  rpc=20736  ─────┴───┘   │
│                    VBFT consensus on localhost P2P      │
└────────────────────────────────────────────────────────┘
     │  HTTPS (public)
     ▼
┌──────────────────────────┐
│  dna-bootstrap           │  https://dna-bootstrap.onrender.com
│  (separate Web Service)  │  GET /genesis-config  GET /peers
└──────────────────────────┘
```

---

## Services Required (2 total)

| # | Service Name | Type | Tier | Script |
|---|---|---|---|---|
| 1 | `dna-bootstrap` | Web Service | Free ✅ | `deploy/start-bootstrap.sh` |
| 2 | `dna-network` | Web Service | Free ✅ | `deploy/start-all-nodes.sh` |

---

## Step 1 — Push the Repo

```bash
cd /workspaces/DNA

git add deploy/start-all-nodes.sh deploy/RENDER_DEPLOY.md
git commit -m "feat: all-in-one node runner for Render free tier"
git push origin master
```

---

## Step 2 — Bootstrap Service ✅ Already Live

```
https://dna-bootstrap.onrender.com
```

Fix the health check path (if not done already):
- Render Dashboard → `dna-bootstrap` → **Settings** → **Health Check Path** → `/status`

---

## Step 3 — Create `dna-network` Web Service

**New +** → **Web Service** → connect your GitHub repo.

| Field | Value |
|---|---|
| **Name** | `dna-network` |
| **Language** | `Native` |
| **Branch** | `master` |
| **Build Command** | `chmod +x dnaNode deploy/start-all-nodes.sh` |
| **Start Command** | `bash deploy/start-all-nodes.sh` |
| **Instance Type** | **Free** |
| **Health Check Path** | `/health` |

### Environment Variables

| Key | Value |
|---|---|
| `WALLET_PASSWORD` | `123456` |
| `BOOTSTRAP_HOST` | `dna-bootstrap.onrender.com` |
| `DATA_BASE` | `/tmp/chain` |

> `PORT` is **injected automatically** by Render — do not set it manually.

---

## Step 4 — Verify the Network

Once `dna-network` shows **Live**, test from your browser or terminal:

```bash
# Health check (all 5 nodes running?)
curl https://dna-network.onrender.com/health

# Block height (is consensus producing blocks?)
curl https://dna-network.onrender.com/rpc/blockcount

# View logs for node 1
curl https://dna-network.onrender.com/logs/1

# View logs for node 3
curl https://dna-network.onrender.com/logs/3

# Full JSON-RPC — any method
curl -s -d '{"jsonrpc":"2.0","method":"getblockcount","params":[],"id":1}' \
  -H "Content-Type: application/json" \
  https://dna-network.onrender.com/
```

Healthy output:
```json
{"status": "ok", "nodes": 5}
{"desc":"SUCCESS","error":0,"result":142}
```

---

## Step 5 — Keep Alive (Free Tier)

Free Web Services spin down after 15 min of no traffic.
Set up [UptimeRobot](https://uptimerobot.com) (free) to ping every 5 minutes:

| Monitor | URL |
|---|---|
| Bootstrap | `https://dna-bootstrap.onrender.com/status` |
| Network | `https://dna-network.onrender.com/health` |

---

## Free Tier Limitations

| Issue | Impact | Fix |
|---|---|---|
| 512 MB RAM for all 5 nodes | May be tight | Monitor logs; reduce to 3-4 nodes if OOM |
| Spin-down after 15 min idle | Consensus pauses | UptimeRobot (Step 5) |
| `/tmp/chain` resets on restart | Chain data lost | Upgrade to Starter + Disk (`DATA_BASE=/chain-data`) |
| Single public endpoint | Only node 1 RPC exposed | Use `GET /logs/<n>` to debug individual nodes |

---

## Viewing Logs Per Node

The health server exposes the last 100 log lines for any node:

```bash
curl https://dna-network.onrender.com/logs/1   # node 1
curl https://dna-network.onrender.com/logs/2   # node 2
# ... up to /logs/5
```

Or check all at once:
```bash
for i in 1 2 3 4 5; do
  echo "=== Node $i ==="
  curl -s https://dna-network.onrender.com/logs/$i | tail -5
done
```

---

## All Environment Variables

| Variable | Required | Description |
|---|---|---|
| `WALLET_PASSWORD` | ✅ | Wallet decryption password for all 5 nodes |
| `BOOTSTRAP_HOST` | ✅ | Bootstrap hostname (no `https://`, no trailing slash) |
| `DATA_BASE` | optional | Base dir for chain data (default: `/tmp/chain`) |
| `PORT` | auto | Injected by Render — Python health server listens here |
