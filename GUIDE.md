# DNA Blockchain — Comprehensive Operations Guide

## Table of Contents

1. [Prerequisites & Build](#1-prerequisites--build)
2. [Wallet Management](#2-wallet-management)
3. [Multi-Node Network Setup](#3-multi-node-network-setup)
4. [Verifying Consensus](#4-verifying-consensus)
5. [Asset Balances](#5-asset-balances)
6. [Transactions — Build / Sign / Send](#6-transactions--build--sign--send)
7. [Asset Commands](#7-asset-commands)
8. [Blockchain Explorer Commands](#8-blockchain-explorer-commands)
9. [Smart Contracts](#9-smart-contracts)
10. [Blockchain Import / Export](#10-blockchain-import--export)
11. [Multisig Addresses](#11-multisig-addresses)
12. [Signing Server (sigsvr)](#12-signing-server-sigsvr)
13. [Test Mode (single node)](#13-test-mode-single-node)
14. [Dashboard UI](#14-dashboard-ui)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Prerequisites & Build

**Requirements:** Go 1.12.5+, properly configured `$GOPATH`.

```bash
cd /workspaces/DNA
make
# Produces: ./dnaNode
```

---

## 2. Wallet Management

### Create a wallet (default key type)
```bash
./dnaNode account add -d --wallet node1/wallet.dat
# Enter password twice when prompted, e.g. 123456
```

### List accounts in a wallet
```bash
./dnaNode account list --wallet node1/wallet.dat
./dnaNode account list -v --wallet node1/wallet.dat   # verbose: shows pubkey & scheme
```

### Export a wallet
```bash
./dnaNode account export --wallet node1/wallet.dat /workspaces/DNA/wallets/exported_wallet.dat
```

### Import a wallet
```bash
./dnaNode account import --wallet /workspaces/DNA/wallets/local_wallet.dat \
  --source /workspaces/DNA/wallets/exported_wallet.dat
```

---

## 3. Multi-Node Network Setup

### Step 1 — Create node directories and copy binaries

```bash
cd /workspaces/DNA
mkdir -p node1 node2 node3 node4
for i in 1 2 3 4; do cp dnaNode node$i/; cp config.json node$i/; done
```

### Step 2 — Create one wallet per node

```bash
./dnaNode account add -d --wallet node1/wallet.dat   # password: 123456
./dnaNode account add -d --wallet node2/wallet.dat
./dnaNode account add -d --wallet node3/wallet.dat
./dnaNode account add -d --wallet node4/wallet.dat
```

### Step 3 — Collect public keys and addresses

```bash
./dnaNode account list -v --wallet node1/wallet.dat
./dnaNode account list -v --wallet node2/wallet.dat
./dnaNode account list -v --wallet node3/wallet.dat
./dnaNode account list -v --wallet node4/wallet.dat
```

### Step 4 — Edit config.json

Update `SeedList` and the `peers` array with the addresses and pubkeys from Step 3.
Use `127.0.0.1` (not `127.0.0.01`) for loopback seeds.

```json
{
  "SeedList": [
    "127.0.0.1:20338",
    "127.0.0.1:20438",
    "127.0.0.1:20538",
    "127.0.0.1:20638"
  ],
  "ConsensusType": "vbft",
  "VBFT": {
    "n": 4, "c": 1, "k": 4, "l": 64,
    "block_msg_delay": 10000,
    "hash_msg_delay": 10000,
    "peer_handshake_timeout": 10,
    "max_block_change_view": 3000,
    "peers": [
      { "index": 1, "peerPubkey": "<node1-pubkey>", "address": "<node1-address>", "initPos": 10000 },
      { "index": 2, "peerPubkey": "<node2-pubkey>", "address": "<node2-address>", "initPos": 10000 },
      { "index": 3, "peerPubkey": "<node3-pubkey>", "address": "<node3-address>", "initPos": 10000 },
      { "index": 4, "peerPubkey": "<node4-pubkey>", "address": "<node4-address>", "initPos": 10000 }
    ]
  }
}
```

Copy the updated config to each node directory:
```bash
for i in 1 2 3 4; do cp config.json node$i/; done
```

### Step 5 — Start each node (separate terminals)

> **Critical flags:** `--password` and `--enable-consensus` are both required for VBFT block production.

```bash
# Terminal 1
cd /workspaces/DNA/node1
./dnaNode --config config.json --data-dir Chain --wallet wallet.dat \
  --nodeport 20338 --rpcport 20336 --restport 20334 --wsport 20335 \
  --password 123456 --enable-consensus

# Terminal 2
cd /workspaces/DNA/node2
./dnaNode --config config.json --data-dir Chain --wallet wallet.dat \
  --nodeport 20438 --rpcport 20436 --restport 20434 --wsport 20435 \
  --password 123456 --enable-consensus

# Terminal 3
cd /workspaces/DNA/node3
./dnaNode --config config.json --data-dir Chain --wallet wallet.dat \
  --nodeport 20538 --rpcport 20536 --restport 20534 --wsport 20535 \
  --password 123456 --enable-consensus

# Terminal 4
cd /workspaces/DNA/node4
./dnaNode --config config.json --data-dir Chain --wallet wallet.dat \
  --nodeport 20638 --rpcport 20636 --restport 20634 --wsport 20635 \
  --password 123456 --enable-consensus
```

---

## 4. Verifying Consensus

Once all 4 nodes are running you should see `vbft actor started` and `Consensus init success` in each log.

```bash
# Check block height on all nodes
cd /workspaces/DNA
./dnaNode info curblockheight --rpcport 20336
./dnaNode info curblockheight --rpcport 20436
./dnaNode info curblockheight --rpcport 20536
./dnaNode info curblockheight --rpcport 20636
```

Height should increment every few seconds once all 4 peers are connected.

```bash
# Check peer connection count via JSON-RPC
curl -s -X POST http://127.0.0.1:20336 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"getconnectioncount","params":[],"id":1}'
# Expected: "result":3  (each node sees 3 peers)
```

---

## 5. Asset Balances

The correct syntax passes the address as a positional argument (not `--address`):

```bash
# Check GAS balance of an address
./dnaNode asset balance ARDRC7826okF5FqoADoh433upmnhoahSTq --rpcport 20336

# Check balance using a wallet file (resolves by label/index too)
./dnaNode asset balance 1 --wallet node1/wallet.dat --rpcport 20336
```

---

## 6. Transactions — Build / Sign / Send

### Quick path: build → sign → send

```bash
cd /workspaces/DNA

# 1. Build a raw transfer transaction (asset must be "gas")
./dnaNode buildtx transfer \
  --wallet node1/wallet.dat \
  --from ARDRC7826okF5FqoADoh433upmnhoahSTq \
  --to   ALMVNfjRsCiEjrgVdmV6pP5jgXgw2S28wo \
  --amount 1 \
  --asset gas 2>/dev/null | tail -1 > tx.raw

cat tx.raw   # should be a long hex string

# 2. Sign the transaction (uses Python PTY to supply password non-interactively)
python3 - <<'EOF'
import pty, os, select, subprocess
RAW_TX = open('tx.raw').read().strip()
cmd = ['./dnaNode', 'sigtx',
       '--wallet', 'node1/wallet.dat',
       '--account', 'ARDRC7826okF5FqoADoh433upmnhoahSTq',
       '--rpcport', '20336', RAW_TX]
master, slave = pty.openpty()
p = subprocess.Popen(cmd, stdin=slave, stdout=slave, stderr=slave)
os.close(slave)
out = b''; sent = False
while True:
    r, _, _ = select.select([master], [], [], 5)
    if not r: break
    try: chunk = os.read(master, 4096)
    except OSError: break
    out += chunk
    if not sent and b'Password' in out:
        os.write(master, b'123456\n'); sent = True
p.wait(); os.close(master)
lines = [l for l in out.decode(errors='ignore').splitlines() if l.strip() and 'Password' not in l]
print(lines[-1])
EOF
# Redirect output to tx.signed:
# python3 sign_helper.py > tx.signed

# 3. Send the signed transaction
./dnaNode sendtx --rpcport 20336 "$(cat tx.signed)"
```

### Inspect a raw transaction before sending
```bash
./dnaNode showtx "$(cat tx.raw)"
```

### Check transaction status after sending
```bash
./dnaNode info status <tx-hash> --rpcport 20336
```

### Look up a transaction by hash
```bash
./dnaNode info tx <tx-hash> --rpcport 20336
```

### Build approve / transferfrom transactions
```bash
# Approve
./dnaNode buildtx approve \
  --wallet node1/wallet.dat \
  --from <from-address> --to <to-address> \
  --amount 10 --asset gas 2>/dev/null | tail -1

# TransferFrom
./dnaNode buildtx transferfrom \
  --wallet node1/wallet.dat \
  --from <from-address> --to <to-address> \
  --amount 5 --asset gas 2>/dev/null | tail -1
```

---

## 7. Asset Commands

These commands submit transactions directly (build + sign + broadcast in one step).

```bash
# Direct transfer (prompts for password)
./dnaNode asset transfer \
  --wallet node1/wallet.dat \
  --from ARDRC7826okF5FqoADoh433upmnhoahSTq \
  --to   ALMVNfjRsCiEjrgVdmV6pP5jgXgw2S28wo \
  --amount 1 --asset gas \
  --gasprice 0 --gaslimit 20000 \
  --rpcport 20336

# Approve an allowance
./dnaNode asset approve \
  --wallet node1/wallet.dat \
  --from <from> --to <to> \
  --amount 10 --asset gas --rpcport 20336

# Transfer from an approved allowance
./dnaNode asset transferfrom \
  --wallet node1/wallet.dat \
  --sender <sender> --from <from> --to <to> \
  --amount 5 --asset gas --rpcport 20336

# Check allowance
./dnaNode asset allowance \
  --wallet node1/wallet.dat \
  --from <from> --to <to> \
  --asset gas --rpcport 20336
```

---

## 8. Blockchain Explorer Commands

```bash
# Current block height
./dnaNode info curblockheight --rpcport 20336

# Block by height
./dnaNode info block 1 --rpcport 20336

# Block by hash
./dnaNode info block <block-hash> --rpcport 20336

# Transaction details
./dnaNode info tx <tx-hash> --rpcport 20336

# Transaction execution status
./dnaNode info status <tx-hash> --rpcport 20336
```

### Direct JSON-RPC queries

```bash
# Block count
curl -s -X POST http://127.0.0.1:20336 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"getblockcount","params":[],"id":1}'

# Best block hash
curl -s -X POST http://127.0.0.1:20336 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"getbestblockhash","params":[],"id":1}'

# Block by height
curl -s -X POST http://127.0.0.1:20336 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"getblock","params":[1,1],"id":1}'
```

---

## 9. Smart Contracts

### Deploy a NeoVM contract
```bash
./dnaNode contract deploy \
  --wallet node1/wallet.dat \
  --rpcport 20336 \
  --code /path/to/contract.avm \
  --name "MyContract" \
  --version "1.0" \
  --author "dev" \
  --email "dev@example.com" \
  --desc "Test contract" \
  --needstore true \
  --gaslimit 20000000 \
  --gasprice 0
```

### Invoke a contract
```bash
./dnaNode contract invoke \
  --wallet node1/wallet.dat \
  --rpcport 20336 \
  --address <contract-address> \
  --params "string:hello" \
  --gaslimit 20000 \
  --gasprice 0
```

### Pre-execute (dry run, no commit)
```bash
./dnaNode contract invoke \
  --wallet node1/wallet.dat \
  --rpcport 20336 \
  --address <contract-address> \
  --params "string:hello" \
  --prepare
```

---

## 10. Blockchain Import / Export

```bash
# Export blocks 0–100 to a file
./dnaNode export --rpcport 20336 \
  --exportfile Blocks_0_100.dat \
  --startheight 0 \
  --endheight 100

# Import blocks from a file
./dnaNode import --importfile Blocks_0_100.dat --rpcport 20336
```

---

## 11. Multisig Addresses

```bash
# Generate a 2-of-3 multisig address
./dnaNode multisigaddr -m 2 \
  --pubkey pubkey1,pubkey2,pubkey3
```

---

## 12. Signing Server (sigsvr)

The signing server exposes an HTTP API for signing transactions without exposing the wallet password to callers.

```bash
# Start the signing server
./dnaNode sigsvr \
  --wallet node1/wallet.dat \
  --password 123456 \
  --port 20000

# Sign a raw transaction via HTTP
curl -s -X POST http://127.0.0.1:20000/api/v1/sigrawtx \
  -H 'Content-Type: application/json' \
  -d '{"qid":"1","method":"sigrawtx","params":{"raw_tx":"<hex>"}}'
```

---

## 13. Test Mode (single node)

Test mode runs a solo consensus node with a pre-funded default account — no config editing required.

```bash
./dnaNode --testmode --password 123456
```

The default wallet is `./wallet.dat`. The genesis account holds the full token supply.

```bash
# Check balance in testmode
./dnaNode asset balance 1 --wallet wallet.dat --rpcport 20336
```

---

## 14. Dashboard UI

The dashboard is a browser-based control panel that wraps all CLI commands via a Python HTTP backend.

### Start the dashboard server

```bash
cd /workspaces/DNA/dashboard
python3 server.py
# Listening on http://0.0.0.0:8080
```

Open `http://localhost:8080` in your browser.

### Dashboard pages

| Page | What it does |
|------|-------------|
| Dashboard | Live node status, block height, recent transactions, deployed contracts |
| Wallet | Create / unlock / import / export wallet files |
| Nodes | Start/stop network, view per-node logs, connection health |
| Transactions | Quick transfer, advanced build/sign/send pipeline, transaction history |
| Contracts | Deploy and invoke smart contracts, contract registry |
| Explorer | Block lookup, transaction lookup, balance check, asset approve/transferfrom/allowance, multisig address generation |

### API endpoints (all served on port 8080)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Node status, block height, wallet state |
| GET | `/api/blockchain/status` | Current block height |
| GET | `/api/block/<height\|hash>` | Block details |
| GET | `/api/tx/<hash>` | Transaction details |
| GET | `/api/status/<hash>` | Transaction execution status |
| GET | `/api/node/<name>/log` | Last 200 lines of a node log |
| GET | `/api/transaction/history` | Recorded transaction history |
| GET | `/api/contract/list` | Deployed contract registry |
| POST | `/api/wallet/create` | Create a new wallet |
| POST | `/api/wallet/list` | List accounts in a wallet |
| POST | `/api/wallet/import` | Import wallet from source file |
| POST | `/api/wallet/export` | Export wallet to file |
| POST | `/api/account/balance` | Query address balance |
| POST | `/api/asset/transfer` | Direct asset transfer |
| POST | `/api/asset/approve` | Approve asset allowance |
| POST | `/api/asset/transferfrom` | Transfer from allowance |
| POST | `/api/asset/allowance` | Check allowance |
| POST | `/api/multisig/address` | Generate multisig address |
| POST | `/api/node/start` | Launch all nodes via script |
| POST | `/api/node/stop` | Stop all dnaNode processes |
| POST | `/api/transaction/transfer` | Build + send transfer |
| POST | `/api/transaction/build` | Build raw transaction |
| POST | `/api/transaction/sign` | Sign raw transaction |
| POST | `/api/transaction/send` | Send signed raw transaction |
| POST | `/api/transaction/show` | Inspect raw transaction |
| POST | `/api/contract/deploy` | Deploy a smart contract |
| POST | `/api/contract/invoke` | Invoke a smart contract |
| POST | `/api/blockchain/import` | Import blocks from file |
| POST | `/api/blockchain/export` | Export blocks to file |

---

## 15. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `CurrentBlockHeight = 0` forever | `--enable-consensus` missing | Restart nodes with `--enable-consensus` |
| `decrypt private key error: invalid argument` | Wrong wallet password | Pass correct `--password` |
| `INVALID PARAMS (42002)` on sendtx | `tx.signed` is empty or contains error text | Re-run sigtx; check password |
| `balance insufficient` | Address has 0 GAS | Use testmode or fund from genesis account |
| `unsupport asset:ONG` / `unsupport asset:ont` | Only `gas` is valid for `buildtx transfer` | Use `--asset gas` |
| `flag provided but not defined: -address` | Wrong flag syntax for `asset balance` | Pass address as positional arg: `asset balance <address>` |
| `lookup 127.0.0.01: no such host` | Typo in config SeedList | Change `127.0.0.01` → `127.0.0.1` |
| `address already in use` | Port conflict | Choose different ports or kill existing process |
| Nodes connect but no blocks | Password not supplied → consensus can't sign | Restart with `--password <pw> --enable-consensus` |
