# DNA Frontend

Next.js dashboard for managing the DNA blockchain network — nodes, wallets, transactions, contracts, and contacts.

## Design

Dark theme with gold/yellow accents, matching the provided design concept (`Screenshot 2026-07-15 110824.png`).

## Prerequisites

- Node.js 18+
- Running DNA nodes (default RPC ports 20336–20636)
- Built `dnaNode` binary at `/workspaces/DNA/dnaNode`

## Setup

```bash
cd /workspaces/DNA/dna-frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard — network overview, block chart, recent activity |
| `/nodes` | Start/stop network, node status, logs |
| `/wallets` | Account list, balances, create wallet |
| `/transactions` | Transfer, approve, build/sign/send, history |
| `/contracts` | Deploy & invoke smart contracts |
| `/contacts` | Address book |
| `/explorer` | Block/tx/RPC explorer |
| `/help` | CLI commands & API reference |
| `/settings` | Default paths and ports |

## API Routes

All routes are under `/api/`:

- `GET /api/health` — node status, block height, history
- `GET/POST /api/blockchain` — chain info, import/export
- `GET /api/blockchain/block?q=1` — block by height/hash
- `POST /api/wallets` — wallet CRUD, balance
- `POST /api/transactions/actions` — transfers, approve, sign, send
- `GET/POST /api/contracts` — deploy, invoke, list
- `GET/POST/DELETE /api/contacts` — address book
- `GET/POST /api/nodes` — node logs, start/stop
- `POST /api/rpc` — generic JSON-RPC proxy

## Troubleshooting

### `Cannot find module './276.js'` or webpack chunk 500 errors

This happens when dev and production builds share a corrupted `.next` cache. Fix:

```bash
# Stop any running Next.js server first (Ctrl+C)
pkill -f "next dev" || true
fuser -k 3000/tcp 2>/dev/null || true

cd /workspaces/DNA/dna-frontend
npm run clean
npm run build    # optional: verify production build
npm run dev
```

Do **not** run `npm run build` while `npm run dev` is already running.

### Port 3000 already in use

```bash
fuser -k 3000/tcp
npm run dev
```

## Environment

```bash
DNA_ROOT=/workspaces/DNA
DNA_NODE_BIN=/workspaces/DNA/dnaNode
DNA_WALLET=/workspaces/DNA/node1/wallet.dat
DNA_WALLET_PASSWORD=123456
DNA_RPC_PORT=20336
```
