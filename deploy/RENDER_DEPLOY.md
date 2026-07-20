# DNA Network — Render Deployment Guide

## Network Overview

6 Render services total. **Deploy them in order — bootstrap first.**

| # | Service Name | Render Type | URL / Access |
|---|---|---|---|
| 1 | `dna-bootstrap` | **Web Service** | `https://dna-bootstrap.onrender.com` ✅ Live |
| 2 | `dna-node-1` | Background Worker | Internal only |
| 3 | `dna-node-2` | Background Worker | Internal only |
| 4 | `dna-node-3` | Background Worker | Internal only |
| 5 | `dna-node-4` | Background Worker | Internal only |
| 6 | `dna-node-5` | Background Worker | Internal only |

```
  You / Clients
       │
       ▼  HTTPS
┌──────────────────────────────────────┐
│  dna-bootstrap  (Web Service)        │  https://dna-bootstrap.onrender.com
│                                      │
│  GET  /genesis-config  ← nodes use   │
│  GET  /peers           ← peer list   │
│  GET  /status          ← health ✅   │
└──────────────────┬───────────────────┘
                   │ announces peer seeds on startup
       ┌───────────┼───────────┬───────────┬───────────┐
       ▼           ▼           ▼           ▼           ▼
  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
  │ node-1  │ │ node-2  │ │ node-3  │ │ node-4  │ │ node-5  │
  │ :20338  │◀│ :20438  │◀│ :20538  │◀│ :20638  │◀│ :20738  │
  │ worker  │▶│ worker  │▶│ worker  │▶│ worker  │▶│ worker  │
  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
              Render internal private network (VBFT consensus P2P)
```

---

## Step 1 — Push the Repo

Make sure all required files are committed and pushed:

```bash
cd /workspaces/DNA

git add .gitignore render.yaml
git add deploy/start-bootstrap.sh deploy/start-node.sh deploy/RENDER_DEPLOY.md
git add dnaNode                               # compiled binary (~25 MB)
git add node1/wallet.dat node2/wallet.dat \
        node3/wallet.dat node4/wallet.dat \
        node5/wallet.dat                      # validator keys (encrypted)

git commit -m "feat: Render deployment config"
git push origin master
```

---

## Step 2 — Bootstrap Service ✅ Already Live

The bootstrap service is already deployed at:
```
https://dna-bootstrap.onrender.com
```

### Fix the health check (do this now)

Render's health checker pings `/` which returns 404. Change it to `/status`:

1. Render Dashboard → `dna-bootstrap` → **Settings**
2. Scroll to **Health Check Path**
3. Change `/` → `/status`
4. Save

You can verify it works:
```bash
curl https://dna-bootstrap.onrender.com/status
curl https://dna-bootstrap.onrender.com/genesis-config
curl https://dna-bootstrap.onrender.com/peers
```

---

## Step 3 — Create the 5 Node Services

For **each** of the 5 nodes, do: **New +** → **Background Worker** → connect your GitHub repo.

Use these settings for every node:

| Field | Value |
|---|---|
| **Runtime** | `Native` |
| **Build Command** | `chmod +x dnaNode deploy/start-node.sh` |
| **Start Command** | `bash deploy/start-node.sh` |
| **Instance Type** | Free |

Then add the environment variables from the table for that node:

---

### `dna-node-1` — Environment Variables

| Key | Value |
|---|---|
| `NODE_NUM` | `1` |
| `NODE_PORT` | `20338` |
| `RPC_PORT` | `20336` |
| `REST_PORT` | `20334` |
| `WS_PORT` | `20335` |
| `WALLET_PASSWORD` | `123456` |
| `DATA_DIR` | `/tmp/chain` |
| `BOOTSTRAP_HOST` | `dna-bootstrap.onrender.com` |

---

### `dna-node-2` — Environment Variables

| Key | Value |
|---|---|
| `NODE_NUM` | `2` |
| `NODE_PORT` | `20438` |
| `RPC_PORT` | `20436` |
| `REST_PORT` | `20434` |
| `WS_PORT` | `20435` |
| `WALLET_PASSWORD` | `123456` |
| `DATA_DIR` | `/tmp/chain` |
| `BOOTSTRAP_HOST` | `dna-bootstrap.onrender.com` |

---

### `dna-node-3` — Environment Variables

| Key | Value |
|---|---|
| `NODE_NUM` | `3` |
| `NODE_PORT` | `20538` |
| `RPC_PORT` | `20536` |
| `REST_PORT` | `20534` |
| `WS_PORT` | `20535` |
| `WALLET_PASSWORD` | `123456` |
| `DATA_DIR` | `/tmp/chain` |
| `BOOTSTRAP_HOST` | `dna-bootstrap.onrender.com` |

---

### `dna-node-4` — Environment Variables

| Key | Value |
|---|---|
| `NODE_NUM` | `4` |
| `NODE_PORT` | `20638` |
| `RPC_PORT` | `20636` |
| `REST_PORT` | `20634` |
| `WS_PORT` | `20635` |
| `WALLET_PASSWORD` | `123456` |
| `DATA_DIR` | `/tmp/chain` |
| `BOOTSTRAP_HOST` | `dna-bootstrap.onrender.com` |

---

### `dna-node-5` — Environment Variables

| Key | Value |
|---|---|
| `NODE_NUM` | `5` |
| `NODE_PORT` | `20738` |
| `RPC_PORT` | `20736` |
| `REST_PORT` | `20734` |
| `WS_PORT` | `20735` |
| `WALLET_PASSWORD` | `123456` |
| `DATA_DIR` | `/tmp/chain` |
| `BOOTSTRAP_HOST` | `dna-bootstrap.onrender.com` |

---

## Step 4 — Verify the Network

Once all 5 nodes show **Live** in the Render dashboard, verify consensus via
the **Shell** tab on any node service:

```bash
# Is the node running and at what block?
curl -s -d '{"jsonrpc":"2.0","method":"getblockcount","params":[],"id":1}' \
  -H "Content-Type: application/json" http://localhost:20336 | python3 -m json.tool

# How many peers is node-1 connected to? (should be 4)
curl -s -d '{"jsonrpc":"2.0","method":"getconnectioncount","params":[],"id":1}' \
  -H "Content-Type: application/json" http://localhost:20336 | python3 -m json.tool

# Check bootstrap knows about all peers
curl https://dna-bootstrap.onrender.com/peers
```

Healthy output when consensus is running:
```json
{ "result": 42 }   ← block count growing
{ "result": 4  }   ← 4 peers connected
```

---

## What Happens When a Node Starts

1. Node reads `BOOTSTRAP_HOST` → builds URL `https://dna-bootstrap.onrender.com/genesis-config`
2. Fetches the genesis config (network identity, validator public keys, VBFT params)
3. Registers itself with the bootstrap via `POST /register?port=<NODE_PORT>`
4. Connects to the other 4 peers listed in `/peers`
5. Starts VBFT consensus — blocks begin producing every few seconds

---

## Free Tier Limitations

| Issue | Impact | Fix |
|---|---|---|
| Bootstrap spins down after 15 min idle | Nodes can't cold-start without it | Upgrade bootstrap to **Starter** ($7/mo) or use an uptime monitor |
| No persistent disks | `DATA_DIR=/tmp/chain` resets on restart | Add a **Disk** to each node, mount at `/chain-data`, set `DATA_DIR=/chain-data` |
| 512 MB RAM per service | May OOM under heavy consensus load | Monitor and upgrade to Starter if needed |

---

## All Variables Reference

| Variable | Required | Description | Node 1 value |
|---|---|---|---|
| `NODE_NUM` | ✅ | Node index (1–5) | `1` |
| `NODE_PORT` | ✅ | P2P gossip port | `20338` |
| `RPC_PORT` | ✅ | JSON-RPC API | `20336` |
| `REST_PORT` | ✅ | REST API | `20334` |
| `WS_PORT` | ✅ | WebSocket | `20335` |
| `WALLET_PASSWORD` | ✅ | Wallet decryption | `123456` |
| `BOOTSTRAP_HOST` | ✅ | Bootstrap hostname (no `https://`) | `dna-bootstrap.onrender.com` |
| `DATA_DIR` | optional | Chain data path | `/tmp/chain` |
