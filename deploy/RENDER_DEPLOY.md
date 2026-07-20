# Deploying the DNA Network to Render

## Overview

You will manually create **6 Render services** in this order:

| # | Service Name | Type | Purpose |
|---|---|---|---|
| 1 | `dna-bootstrap` | **Web Service** | Peer discovery + genesis config (public URL) |
| 2 | `dna-node-1` | Background Worker | Validator node 1 |
| 3 | `dna-node-2` | Background Worker | Validator node 2 |
| 4 | `dna-node-3` | Background Worker | Validator node 3 |
| 5 | `dna-node-4` | Background Worker | Validator node 4 |
| 6 | `dna-node-5` | Background Worker | Validator node 5 |

**The bootstrap service must be deployed first** because the 5 node services need its
public URL (`BOOTSTRAP_HOST`) to fetch the genesis config and register as peers.

```
                        ┌─────────────────────────────┐
  Internet ────────────▶│  dna-bootstrap  (Web)       │ https://dna-bootstrap.onrender.com
                        │  GET /genesis-config         │
                        │  GET /peers                  │
                        └──────────────┬──────────────┘
                                       │  announces peer list
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                   ▼     ...
              ┌──────────┐      ┌──────────┐       ┌──────────┐
              │ dna-node-1│      │ dna-node-2│       │ dna-node-3│ ...
              │  :20338   │◀────▶│  :20438   │◀─────▶│  :20538   │
              │  worker   │      │  worker   │       │  worker   │
              └──────────┘      └──────────┘       └──────────┘
                    Render internal private network (node ↔ node P2P)
```

---

## Step 1 — Push the Repo to GitHub

Before creating any Render service, make sure the repo is pushed with all required files:

```bash
cd /workspaces/DNA

git add .gitignore
git add render.yaml
git add deploy/start-bootstrap.sh deploy/start-node.sh deploy/RENDER_DEPLOY.md

# The compiled binary (required — Render will run this directly)
git add dnaNode

# Validator wallet files (required — one per node)
git add node1/wallet.dat node2/wallet.dat node3/wallet.dat \
        node4/wallet.dat node5/wallet.dat

git commit -m "feat: add Render deployment config"
git push origin master
```

> [!WARNING]
> `wallet.dat` files hold **encrypted** validator private keys. The test network
> password is `123456`. Do not use this for a real mainnet — use Render
> **Secret Files** to inject production wallets securely.

---

## Step 2 — Create the Bootstrap Web Service

1. Go to [render.com](https://render.com) → **New +** → **Web Service**
2. Connect your GitHub repo
3. Fill in the settings:

| Field | Value |
|---|---|
| **Name** | `dna-bootstrap` |
| **Region** | Choose closest to your users |
| **Branch** | `master` |
| **Runtime** | `Native` |
| **Build Command** | `chmod +x dnaNode deploy/start-bootstrap.sh` |
| **Start Command** | `bash deploy/start-bootstrap.sh` |
| **Instance Type** | Free |

4. Add these **Environment Variables**:

| Key | Value |
|---|---|
| `PORT` | `8090` |
| `NODE1_HOST` | `dna-node-1` |
| `NODE2_HOST` | `dna-node-2` |
| `NODE3_HOST` | `dna-node-3` |
| `NODE4_HOST` | `dna-node-4` |
| `NODE5_HOST` | `dna-node-5` |

5. Click **Create Web Service** and wait for it to deploy.
6. **Copy the public URL** — you will need it for every node service.
   It will look like: `https://dna-bootstrap.onrender.com`

> [!NOTE]
> On the free tier, the web service spins down after 15 minutes of inactivity.
> The first node to start after a spin-down will wait a few seconds for the
> bootstrap to wake up — this is normal. Consider upgrading bootstrap to the
> **Starter** plan ($7/mo) for a production network.

---

## Step 3 — Create the 5 Node Services

Repeat the following for each node (`dna-node-1` through `dna-node-5`).
Use the table below to fill in the correct values per node.

### How to create each node

1. **New +** → **Background Worker**
2. Connect the same GitHub repo
3. Fill in the settings:

| Field | Value |
|---|---|
| **Name** | `dna-node-1` (or 2, 3, 4, 5) |
| **Region** | Same region as bootstrap |
| **Branch** | `master` |
| **Runtime** | `Native` |
| **Build Command** | `chmod +x dnaNode deploy/start-node.sh` |
| **Start Command** | `bash deploy/start-node.sh` |
| **Instance Type** | Free (or Starter for 24/7 uptime) |

4. Add the **Environment Variables** for that node (use table below):

### Per-Node Environment Variables

| Variable | `dna-node-1` | `dna-node-2` | `dna-node-3` | `dna-node-4` | `dna-node-5` |
|---|---|---|---|---|---|
| `NODE_NUM` | `1` | `2` | `3` | `4` | `5` |
| `NODE_PORT` | `20338` | `20438` | `20538` | `20638` | `20738` |
| `RPC_PORT` | `20336` | `20436` | `20536` | `20636` | `20736` |
| `REST_PORT` | `20334` | `20434` | `20534` | `20634` | `20734` |
| `WS_PORT` | `20335` | `20435` | `20535` | `20635` | `20735` |
| `WALLET_PASSWORD` | `123456` | `123456` | `123456` | `123456` | `123456` |
| `DATA_DIR` | `/tmp/chain` | `/tmp/chain` | `/tmp/chain` | `/tmp/chain` | `/tmp/chain` |
| `BOOTSTRAP_HOST` | ← **paste your bootstrap URL hostname here (without `https://`)** → |

> [!IMPORTANT]
> `BOOTSTRAP_HOST` must be just the **hostname**, not the full URL.
> - ✅ Correct: `dna-bootstrap.onrender.com`
> - ❌ Wrong: `https://dna-bootstrap.onrender.com`

> [!NOTE]
> `DATA_DIR` is set to `/tmp/chain` for the free tier because free services
> do not support persistent disks. The chain data will reset on each restart.
> To persist the blockchain state, upgrade to a **Starter** instance and add
> a **Disk** mounted at `/chain-data`, then set `DATA_DIR=/chain-data`.

---

## Step 4 — Verify the Network is Running

Once all 6 services show **Live** in the Render dashboard:

### Check via Render Shell (any node service)

Open the **Shell** tab of any node service in the Render dashboard and run:

```bash
# Check block height (should be > 0 and incrementing)
curl -s -d '{"jsonrpc":"2.0","method":"getblockcount","params":[],"id":1}' \
  -H "Content-Type: application/json" http://localhost:20336

# Check peer connections
curl -s -d '{"jsonrpc":"2.0","method":"getconnectioncount","params":[],"id":1}' \
  -H "Content-Type: application/json" http://localhost:20336
```

Expected output once consensus is running:
```json
{"desc":"SUCCESS","error":0,"id":1,"jsonrpc":"2.0","result":42}
```

### Check bootstrap peer list (public URL)

```bash
curl https://dna-bootstrap.onrender.com/peers
```

---

## Free Tier Limitations & Workarounds

| Limitation | Impact | Workaround |
|---|---|---|
| Web services spin down after 15 min | Bootstrap goes offline → nodes can't fetch genesis config on cold start | Upgrade bootstrap to Starter ($7/mo) or use an uptime monitor to ping it |
| No persistent disks | Chain data lost on restart | Upgrade nodes to Starter + add Disk, set `DATA_DIR=/chain-data` |
| 512 MB RAM | May be tight for 5 active consensus nodes | Monitor memory; upgrade if nodes OOM-crash |
| No public URL for workers | Can't query node RPC externally | Use Render Shell, or run one node as a Web Service with REST enabled |

---

## All Environment Variables Reference

| Variable | Description | Example |
|---|---|---|
| `NODE_NUM` | Which node (1–5) | `1` |
| `NODE_PORT` | P2P gossip port | `20338` |
| `RPC_PORT` | JSON-RPC API port | `20336` |
| `REST_PORT` | REST API port | `20334` |
| `WS_PORT` | WebSocket port | `20335` |
| `WALLET_PASSWORD` | Wallet decryption password | `123456` |
| `BOOTSTRAP_HOST` | Bootstrap service hostname (no `https://`) | `dna-bootstrap.onrender.com` |
| `BOOTSTRAP_PORT` | Bootstrap port (default: `8090`) | `8090` |
| `DATA_DIR` | Blockchain data directory | `/tmp/chain` (free) or `/chain-data` (paid disk) |
