# Deploying the DNA Network to Render

This directory contains everything you need to deploy the 5-node DNA blockchain
network to [Render](https://render.com).

## Architecture

```
Internet
   │
   ▼
┌──────────────────────────────────────────┐
│  dna-bootstrap  (Render Web Service)     │  ← Public HTTPS URL
│  • Serves genesis config                 │    e.g. dna-bootstrap.onrender.com
│  • Peer discovery for new nodes          │
└──────────────────────────────────────────┘
   │ private network
   ├─────────────────────────────────────────┐
   │             │             │             │
   ▼             ▼             ▼             ▼  ...
┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐
│node-1 │  │node-2 │  │node-3 │  │node-4 │  │node-5 │
│:20338 │  │:20438 │  │:20538 │  │:20638 │  │:20738 │
│worker │  │worker │  │worker │  │worker │  │worker │
└───────┘  └───────┘  └───────┘  └───────┘  └───────┘
```

- **Bootstrap** = Render **Web Service** (gets public URL for genesis config)
- **Nodes 1–5** = Render **Background Workers** (private, communicate via internal network)
- Each node has a **5GB persistent disk** for blockchain data at `/chain-data`

---

## Step-by-Step Deployment

### 1. Push to GitHub

Make sure the following are committed to your repo:

```bash
git add dnaNode                    # compiled binary (~25MB)
git add node1/wallet.dat node2/wallet.dat node3/wallet.dat \
        node4/wallet.dat node5/wallet.dat
git add render.yaml deploy/
git add .gitignore
git commit -m "feat: add Render deployment config"
git push origin master
```

> ⚠️ **Security note**: The `wallet.dat` files contain encrypted private keys
> (password: `123456` for the test network). For a production network, use
> Render's **Secret Files** or inject wallets via environment variables.

### 2. Deploy Bootstrap Service First

1. Go to [render.com](https://render.com) → **New** → **Blueprint**
2. Connect your GitHub repo
3. Render detects `render.yaml` and shows all 6 services
4. **Deploy only `dna-bootstrap` first** (uncheck the node services)
5. Wait for it to go live — note the public URL, e.g.:
   ```
   https://dna-bootstrap.onrender.com
   ```

### 3. Update `BOOTSTRAP_HOST` in render.yaml

Edit `render.yaml` and replace all instances of `dna-bootstrap.onrender.com` with your actual bootstrap URL:

```yaml
- key: BOOTSTRAP_HOST
  value: dna-bootstrap.onrender.com   # ← your actual URL here
```

Push the update:
```bash
git add render.yaml && git commit -m "fix: update BOOTSTRAP_HOST" && git push
```

### 4. Deploy All Node Services

Back in Render Dashboard → Blueprint → **Deploy all remaining services**.

All 5 nodes will:
1. Fetch genesis config from the bootstrap URL
2. Initialize their blockchain state
3. Discover each other via the bootstrap peer list
4. Start VBFT consensus

### 5. Verify the Network

Once all nodes are running, check consensus via the RPC of any node.

Render Background Workers don't have public URLs, but you can use Render's
**Shell** access to run commands:

```bash
./dnaNode info status --rpcport 20336
# or
curl -s -d '{"jsonrpc":"2.0","method":"getblockcount","params":[],"id":1}' \
  -H "Content-Type: application/json" http://localhost:20336
```

---

## Environment Variables Reference

| Variable          | Description                          | Example                             |
|-------------------|--------------------------------------|-------------------------------------|
| `NODE_NUM`        | Which node this is (1–5)             | `1`                                 |
| `NODE_PORT`       | P2P port                             | `20338`                             |
| `RPC_PORT`        | JSON-RPC port                        | `20336`                             |
| `REST_PORT`       | REST API port                        | `20334`                             |
| `WS_PORT`         | WebSocket port                       | `20335`                             |
| `WALLET_PASSWORD` | Wallet decryption password           | `123456`                            |
| `BOOTSTRAP_HOST`  | Bootstrap server public hostname     | `dna-bootstrap.onrender.com`        |
| `DATA_DIR`        | Persistent blockchain data directory | `/chain-data` (Render disk mount)   |

---

## Costs (Render Pricing)

| Service        | Plan    | ~Monthly Cost |
|----------------|---------|---------------|
| Bootstrap      | Starter | $7/mo         |
| Node 1–5 (×5) | Starter | $7 × 5 = $35  |
| Disk 5GB (×5)  | —       | $1 × 5 = $5   |
| **Total**      |         | **~$47/mo**   |

Free tier workers spin down after inactivity — use **Starter** or higher for
24/7 blockchain consensus.
