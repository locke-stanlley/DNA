# DNA Network — Render Deployment Guide

## Service Types (Free Tier Compatible)

Background Workers require a paid plan. Run **all 6 services as Web Services** instead —
the DNA node's built-in REST API satisfies Render's HTTP requirement, and P2P ports
work over Render's internal private network between services.

| # | Service Name | Type | Tier |
|---|---|---|---|
| 1 | `dna-bootstrap` | Web Service | Free ✅ |
| 2 | `dna-node-1` | Web Service | Free ✅ |
| 3 | `dna-node-2` | Web Service | Free ✅ |
| 4 | `dna-node-3` | Web Service | Free ✅ |
| 5 | `dna-node-4` | Web Service | Free ✅ |
| 6 | `dna-node-5` | Web Service | Free ✅ |

```
  Internet / Health monitors
       │
       ├──────────────────────────────────────────────────────────┐
       │  HTTPS (public)                                          │  HTTPS (public)
       ▼                                                          ▼
┌─────────────────────────┐                          ┌─────────────────────────┐
│   dna-bootstrap         │                          │   dna-node-1            │
│   Web Service (free)    │                          │   Web Service (free)    │
│                         │                          │                         │
│   GET /genesis-config   │                          │   REST API on $PORT     │
│   GET /peers            │◀── nodes register ───────│   P2P on :20338         │
│   GET /status  ← health │                          │   health: /api/v1/...   │
└─────────────────────────┘                          └────────────┬────────────┘
                                                                  │
                                          Render internal private network
                                                                  │
                                   ┌──────────────────────────────┤
                                   ▼                              ▼
                         ┌─────────────────┐           ┌─────────────────┐
                         │   dna-node-2    │◀─────────▶│   dna-node-3    │ ...
                         │   :20438 (P2P)  │           │   :20538 (P2P)  │
                         └─────────────────┘           └─────────────────┘
```

> **How it works**: Render assigns each Web Service a public `$PORT`. The node
> binds its REST API to `$PORT` (satisfying Render's health check). The fixed P2P
> port (20338/20438/...) is only reachable on Render's internal network — exactly
> what the other nodes need for consensus gossip.

---

## Step 1 — Push the Repo

```bash
cd /workspaces/DNA

git add .gitignore render.yaml
git add deploy/start-bootstrap.sh deploy/start-node.sh deploy/RENDER_DEPLOY.md
git add dnaNode
git add node1/wallet.dat node2/wallet.dat node3/wallet.dat \
        node4/wallet.dat node5/wallet.dat

git commit -m "feat: Render deployment — Web Service free tier"
git push origin master
```

---

## Step 2 — Bootstrap Service ✅ Already Live

```
https://dna-bootstrap.onrender.com
```

### Fix the health check path

1. Render Dashboard → `dna-bootstrap` → **Settings**
2. **Health Check Path** → change `/` to `/status`
3. Save

Verify it's working:
```bash
curl https://dna-bootstrap.onrender.com/status
curl https://dna-bootstrap.onrender.com/genesis-config
```

---

## Step 3 — Create the 5 Node Web Services

For **each** of the 5 nodes: **New +** → **Web Service** → connect your GitHub repo.

### Build & Start settings (same for all 5 nodes)

| Field | Value |
|---|---|
| **Language** | `Native` (select manually — Render may auto-detect Go) |
| **Branch** | `master` |
| **Build Command** | `chmod +x dnaNode deploy/start-node.sh` |
| **Start Command** | `bash deploy/start-node.sh` |
| **Instance Type** | **Free** |
| **Health Check Path** | `/api/v1/block/height` |

### Environment Variables per node

---

#### `dna-node-1`

| Key | Value |
|---|---|
| `NODE_NUM` | `1` |
| `NODE_PORT` | `20338` |
| `RPC_PORT` | `20336` |
| `WS_PORT` | `20335` |
| `WALLET_PASSWORD` | `123456` |
| `DATA_DIR` | `/tmp/chain` |
| `BOOTSTRAP_HOST` | `dna-bootstrap.onrender.com` |

> **Do NOT add `REST_PORT`** — Render injects `$PORT` automatically and the script uses it.

---

#### `dna-node-2`

| Key | Value |
|---|---|
| `NODE_NUM` | `2` |
| `NODE_PORT` | `20438` |
| `RPC_PORT` | `20436` |
| `WS_PORT` | `20435` |
| `WALLET_PASSWORD` | `123456` |
| `DATA_DIR` | `/tmp/chain` |
| `BOOTSTRAP_HOST` | `dna-bootstrap.onrender.com` |

---

#### `dna-node-3`

| Key | Value |
|---|---|
| `NODE_NUM` | `3` |
| `NODE_PORT` | `20538` |
| `RPC_PORT` | `20536` |
| `WS_PORT` | `20535` |
| `WALLET_PASSWORD` | `123456` |
| `DATA_DIR` | `/tmp/chain` |
| `BOOTSTRAP_HOST` | `dna-bootstrap.onrender.com` |

---

#### `dna-node-4`

| Key | Value |
|---|---|
| `NODE_NUM` | `4` |
| `NODE_PORT` | `20638` |
| `RPC_PORT` | `20636` |
| `WS_PORT` | `20635` |
| `WALLET_PASSWORD` | `123456` |
| `DATA_DIR` | `/tmp/chain` |
| `BOOTSTRAP_HOST` | `dna-bootstrap.onrender.com` |

---

#### `dna-node-5`

| Key | Value |
|---|---|
| `NODE_NUM` | `5` |
| `NODE_PORT` | `20738` |
| `RPC_PORT` | `20736` |
| `WS_PORT` | `20735` |
| `WALLET_PASSWORD` | `123456` |
| `DATA_DIR` | `/tmp/chain` |
| `BOOTSTRAP_HOST` | `dna-bootstrap.onrender.com` |

---

## Step 4 — Keep Services Alive (Free Tier)

Free Web Services spin down after **15 minutes of no external traffic**.
Set up a free uptime monitor to ping all 6 services every 5 minutes:

1. Sign up at [uptimerobot.com](https://uptimerobot.com) (free)
2. Create an **HTTP monitor** for each service URL:

| Monitor Name | URL to ping |
|---|---|
| `dna-bootstrap` | `https://dna-bootstrap.onrender.com/status` |
| `dna-node-1` | `https://dna-node-1.onrender.com/api/v1/block/height` |
| `dna-node-2` | `https://dna-node-2.onrender.com/api/v1/block/height` |
| `dna-node-3` | `https://dna-node-3.onrender.com/api/v1/block/height` |
| `dna-node-4` | `https://dna-node-4.onrender.com/api/v1/block/height` |
| `dna-node-5` | `https://dna-node-5.onrender.com/api/v1/block/height` |

3. Set interval to **5 minutes** for all monitors

---

## Step 5 — Verify the Network

Once all nodes are live, test from your local machine:

```bash
# Check block height on node 1 (should be > 0 and growing)
curl https://dna-node-1.onrender.com/api/v1/block/height

# Check how many peers node 1 sees (should be 4)
curl -s https://dna-node-1.onrender.com/api/v1/node/connection/count

# Check bootstrap knows all 5 peers
curl https://dna-bootstrap.onrender.com/peers
```

---

## Free Tier Limitations

| Issue | Impact | Fix |
|---|---|---|
| Services spin down after 15 min idle | Consensus pauses | Use UptimeRobot (see Step 4) |
| No persistent disks | `/tmp/chain` resets on restart | Upgrade to Starter + add Disk, set `DATA_DIR=/chain-data` |
| 512 MB RAM | May OOM under heavy load | Upgrade to Starter ($7/mo) if nodes crash |
| Cold start ~30s | First request slow after spin-down | UptimeRobot prevents this |

---

## All Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `NODE_NUM` | ✅ | Node index (1–5) |
| `NODE_PORT` | ✅ | Fixed P2P port (internal network) |
| `RPC_PORT` | ✅ | Fixed JSON-RPC port (internal network) |
| `WS_PORT` | ✅ | Fixed WebSocket port (internal network) |
| `WALLET_PASSWORD` | ✅ | Wallet decryption password |
| `BOOTSTRAP_HOST` | ✅ | Bootstrap hostname — no `https://`, no trailing slash |
| `DATA_DIR` | optional | Chain data path (default: `/tmp/chain`) |
| `PORT` | auto | **Injected by Render** — used as `--restport` (public HTTP) |
