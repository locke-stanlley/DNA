# DNA Network — Manual Test Guide

End-to-end manual test checklist for the DNA blockchain: build, multi-node VBFT setup, CLI commands, JSON-RPC / REST APIs, HTTP bootstrap, smart contracts, new features, and both dashboards (Python + Next.js).

**Workspace root:** `/workspaces/DNA`  
**Default wallet password (examples):** `123456`

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Build From Scratch](#2-build-from-scratch)
3. [Port & Service Map](#3-port--service-map)
4. [Quick Smoke Test (Solo / Test Mode)](#4-quick-smoke-test-solo--test-mode)
5. [Multi-Node VBFT Network Setup](#5-multi-node-vbft-network-setup)
6. [Configuration Reference & Tests](#6-configuration-reference--tests)
7. [Wallet Management Tests](#7-wallet-management-tests)
8. [Consensus & Node Health](#8-consensus--node-health)
9. [JSON-RPC API Tests](#9-json-rpc-api-tests)
10. [REST API Tests](#10-rest-api-tests)
11. [HTTP Bootstrap & DNS Seeders](#11-http-bootstrap--dns-seeders)
12. [Asset & Balance Tests](#12-asset--balance-tests)
13. [Transaction Pipeline (Build / Sign / Send)](#13-transaction-pipeline-build--sign--send)
14. [Asset Commands (Direct Transfer / Approve)](#14-asset-commands-direct-transfer--approve)
15. [Blockchain Explorer Commands](#15-blockchain-explorer-commands)
16. [Smart Contract Tests](#16-smart-contract-tests)
17. [Validator Staking (stake / unstake)](#17-validator-staking-stake--unstake)
18. [State Pruning (prune)](#18-state-pruning-prune)
19. [Blockchain Import / Export](#19-blockchain-import--export)
20. [Multisig Addresses](#20-multisig-addresses)
21. [Signing Server (sigsvr)](#21-signing-server-sigsvr)
22. [Python Dashboard (port 8080)](#22-python-dashboard-port-8080)
23. [Next.js Frontend Dashboard (port 3000)](#23-nextjs-frontend-dashboard-port-3000)
24. [Automated Feature Test Script](#24-automated-feature-test-script)
25. [Troubleshooting Matrix](#25-troubleshooting-matrix)
26. [Test Session Log Template](#26-test-session-log-template)

---

## 1. Prerequisites

| # | Check | Pass? |
|---|--------|-------|
| 1.1 | Go 1.12.5+ installed (`go version`) | ☐ |
| 1.2 | Node.js 18+ for frontend (`node --version`) | ☐ |
| 1.3 | Python 3 for dashboard / scripts (`python3 --version`) | ☐ |
| 1.4 | `curl` available | ☐ |
| 1.5 | Ports 20334–20638, 3000, 8080 free (or adjust) | ☐ |
| 1.6 | Repo cloned at `/workspaces/DNA` | ☐ |

```bash
cd /workspaces/DNA
go version
node --version
python3 --version
```

---

## 2. Build From Scratch

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 2.1 | `make` completes without error | `./dnaNode` binary created | ☐ |
| 2.2 | `./dnaNode --help` prints usage | Command list shown | ☐ |
| 2.3 | `./dnaNode version` or build shows version | Non-empty version string | ☐ |

```bash
cd /workspaces/DNA
make
ls -la ./dnaNode
./dnaNode --help | head -20
```

**Optional clean rebuild:**

```bash
cd /workspaces/DNA
go clean -cache
make
```

---

## 3. Port & Service Map

| Node | P2P | JSON-RPC | REST | WebSocket |
|------|-----|----------|------|-----------|
| node1 | 20338 | **20336** | 20334 | 20335 |
| node2 | 20438 | 20436 | 20434 | 20435 |
| node3 | 20538 | 20536 | 20534 | 20535 |
| node4 | 20638 | 20636 | 20634 | 20635 |

| Service | Port | URL |
|---------|------|-----|
| Next.js frontend | 3000 | http://localhost:3000 |
| Python dashboard | 8080 | http://localhost:8080 |
| sigsvr (optional) | 20000 | http://localhost:20000 |

Use **20336** as the default RPC port unless testing a specific node.

---

## 4. Quick Smoke Test (Solo / Test Mode)

Fastest way to verify a single node without editing `config.json`.

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 4.1 | Start testmode node | Blocks begin producing | ☐ |
| 4.2 | Query block height | Height > 0 | ☐ |
| 4.3 | Query balance | ONT + GAS shown | ☐ |

```bash
cd /workspaces/DNA
./dnaNode --testmode --password 123456
# In another terminal:
./dnaNode info curblockheight --rpcport 20336
./dnaNode asset balance 1 --wallet wallet.dat --rpcport 20336
```

Stop with `Ctrl+C`.

---

## 5. Multi-Node VBFT Network Setup

### 5.1 Automated setup (recommended)

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 5.1 | Run `scripts/run_multi_node_test.sh` | 4 nodes start in background | ☐ |
| 5.2 | Check logs | `vbft actor started`, `Consensus init success` | ☐ |
| 5.3 | All RPC heights match | Same block height on 20336–20636 | ☐ |
| 5.4 | Connection count | Each node reports 3 peers | ☐ |

```bash
cd /workspaces/DNA
make                                    # if not built
./scripts/run_multi_node_test.sh

# Verify heights
./dnaNode info curblockheight --rpcport 20336
./dnaNode info curblockheight --rpcport 20436
./dnaNode info curblockheight --rpcport 20536
./dnaNode info curblockheight --rpcport 20636

# Peer count
curl -s -X POST http://127.0.0.1:20336 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"getconnectioncount","params":[],"id":1}'

# Tail logs
tail -f node1/node.log
```

Stop all nodes:

```bash
pkill -f 'dnaNode --config config.json' || true
```

### 5.2 Manual setup (step-by-step)

Use when you need full control over wallets and `config.json`.

```bash
cd /workspaces/DNA
mkdir -p node1 node2 node3 node4
for i in 1 2 3 4; do cp dnaNode node$i/; cp config.json node$i/; done

# Create wallets (password: 123456)
./dnaNode account add -d --wallet node1/wallet.dat
./dnaNode account add -d --wallet node2/wallet.dat
./dnaNode account add -d --wallet node3/wallet.dat
./dnaNode account add -d --wallet node4/wallet.dat

# Collect pubkeys & addresses
./dnaNode account list -v --wallet node1/wallet.dat
./dnaNode account list -v --wallet node2/wallet.dat
./dnaNode account list -v --wallet node3/wallet.dat
./dnaNode account list -v --wallet node4/wallet.dat
```

Edit `config.json` — update `VBFT.peers[]` with each node's `peerPubkey`, `address`, and `initPos`. Ensure `SeedList` uses `127.0.0.1` (not `127.0.0.01`):

```json
"SeedList": [
  "127.0.0.1:20338",
  "127.0.0.1:20438",
  "127.0.0.1:20538",
  "127.0.0.1:20638"
]
```

Copy config to all nodes and start (one terminal each):

```bash
for i in 1 2 3 4; do cp config.json node$i/; done

# Terminal 1
cd /workspaces/DNA/node1
./dnaNode --config config.json --data-dir Chain --wallet wallet.dat \
  --nodeport 20338 --rpcport 20336 --restport 20334 --wsport 20335 \
  --rest --ws --password 123456 --enable-consensus

# Terminal 2 — nodeport 20438, rpcport 20436, restport 20434, wsport 20435
# Terminal 3 — nodeport 20538, rpcport 20536, restport 20534, wsport 20535
# Terminal 4 — nodeport 20638, rpcport 20636, restport 20634, wsport 20635
```

> **Critical:** `--password` and `--enable-consensus` are required for VBFT block production.

---

## 6. Configuration Reference & Tests

### 6.1 Core `config.json` fields

| Field | Purpose | Test |
|-------|---------|------|
| `SeedList` | P2P bootstrap peer addresses | Nodes connect (3 peers each) |
| `ConsensusType` | Must be `"vbft"` for multi-node | Blocks produced |
| `VBFT.n` | Validator count (4) | 4 peers in config |
| `VBFT.peers[].peerPubkey` | Validator public key | Matches wallet `-v` output |
| `VBFT.peers[].address` | Validator base58 address | Matches wallet address |
| `VBFT.peers[].initPos` | Initial stake (≥ `min_init_stake`) | Consensus starts |
| `VBFT.min_init_stake` | Minimum stake (10000) | Stake commands respect minimum |

### 6.2 P2P bootstrap extensions (optional)

These fields live in the P2P node config (`common/config/config.go`). Add to your node config JSON when testing HTTP bootstrap / DNS seeders:

```json
{
  "P2PNode": {
    "HttpBootstrapServer": "http://127.0.0.1:8090",
    "DnsSeeders": ["seed1.example.com", "seed2.example.com"]
  }
}
```

**Note:** `HttpBootstrapServer` is the **base URL** (no `/peers` suffix). Nodes call `POST {url}/register?port=<p2p-port>` and `GET {url}/peers`.

| # | Test | Expected | Pass? |
|---|------|----------|-------|
| 6.2.1 | Start node with valid `HttpBootstrapServer` | Log: registered to bootstrap (or connection attempt) | ☐ |
| 6.2.2 | Start node with `DnsSeeders` | DNS lookup attempted in logs | ☐ |
| 6.2.3 | Invalid seeder hostname | Warning logged, node continues with SeedList | ☐ |

Check logs:

```bash
grep -i bootstrap node1/node.log
grep -i seeder node1/node.log
```

---

## 7. Wallet Management Tests

Replace `<wallet>` with `node1/wallet.dat` and use password `123456` when prompted.

| # | Command | Expected | Pass? |
|---|---------|----------|-------|
| 7.1 | `account add -d --wallet <wallet>` | New account created | ☐ |
| 7.2 | `account list --wallet <wallet>` | Index + address listed | ☐ |
| 7.3 | `account list -v --wallet <wallet>` | Pubkey + signature scheme shown | ☐ |
| 7.4 | `account export --wallet <wallet> /tmp/export.dat` | File created | ☐ |
| 7.5 | `account import --wallet /tmp/new.dat --source /tmp/export.dat` | Import succeeds | ☐ |

```bash
cd /workspaces/DNA
./dnaNode account add -d --wallet node1/wallet.dat
./dnaNode account list -v --wallet node1/wallet.dat

# Save FROM_ADDRESS and TO_ADDRESS from node1 and node2 wallets for later tests
```

---

## 8. Consensus & Node Health

| # | Test | Command | Expected | Pass? |
|---|------|---------|----------|-------|
| 8.1 | Block height increasing | `info curblockheight --rpcport 20336` (wait 10s, repeat) | Height grows | ☐ |
| 8.2 | Heights synced | Compare all 4 RPC ports | Within 1–2 blocks | ☐ |
| 8.3 | Peer connections | `getconnectioncount` RPC | Result: 3 per node | ☐ |
| 8.4 | Network ID | `getnetworkid` RPC | Same ID on all nodes | ☐ |
| 8.5 | Version | `getversion` RPC | Version string returned | ☐ |
| 8.6 | Mempool | `getmempooltxcount` RPC | Integer (often 0) | ☐ |
| 8.7 | Sync status | REST `GET /api/v1/node/syncstatus` | JSON response | ☐ |

```bash
# Repeat twice, 10 seconds apart
./dnaNode info curblockheight --rpcport 20336

curl -s http://127.0.0.1:20334/api/v1/node/syncstatus | jq .
curl -s http://127.0.0.1:20334/api/v1/node/connectioncount | jq .
```

---

## 9. JSON-RPC API Tests

Default endpoint: `http://127.0.0.1:20336` (POST, `Content-Type: application/json`).

| # | Method | Params | Expected | Pass? |
|---|--------|--------|----------|-------|
| 9.1 | `getblockcount` | `[]` | Integer > 0 | ☐ |
| 9.2 | `getbestblockhash` | `[]` | 64-char hex hash | ☐ |
| 9.3 | `getblock` | `[1, 1]` | Block JSON with header | ☐ |
| 9.4 | `getconnectioncount` | `[]` | `3` (4-node network) | ☐ |
| 9.5 | `getnetworkid` | `[]` | Network ID integer | ☐ |
| 9.6 | `getversion` | `[]` | Version string | ☐ |
| 9.7 | `getgasprice` | `[]` | Gas price integer | ☐ |
| 9.8 | `getmempooltxcount` | `[]` | Integer | ☐ |
| 9.9 | `getbalance` | `["<address>"]` | `ont`, `gas`, `height` fields | ☐ |

```bash
ADDR="ARDRC7826okF5FqoADoh433upmnhoahSTq"   # replace with your address

curl -s -X POST http://127.0.0.1:20336 -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"getblockcount","params":[],"id":1}' | jq .

curl -s -X POST http://127.0.0.1:20336 -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"getbestblockhash","params":[],"id":1}' | jq .

curl -s -X POST http://127.0.0.1:20336 -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"getblock","params":[1,1],"id":1}' | jq .

curl -s -X POST http://127.0.0.1:20336 -H 'Content-Type: application/json' \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"getbalance\",\"params\":[\"$ADDR\"],\"id\":1}" | jq .
```

---

## 10. REST API Tests

REST base: `http://127.0.0.1:20334/api/v1/`

| # | Endpoint | Expected | Pass? |
|---|----------|----------|-------|
| 10.1 | `GET /node/version` | Version JSON | ☐ |
| 10.2 | `GET /node/connectioncount` | Connection count | ☐ |
| 10.3 | `GET /block/height` | Current height | ☐ |
| 10.4 | `GET /block/hash/1` | Block hash at height 1 | ☐ |
| 10.5 | `GET /block/details/height/1` | Full block details | ☐ |
| 10.6 | `GET /balance/<addr>` | Balance for address | ☐ |
| 10.7 | `GET /gasprice` | Gas price | ☐ |
| 10.8 | `GET /mempool/txcount` | Mempool size | ☐ |
| 10.9 | `GET /networkid` | Network ID | ☐ |

```bash
ADDR="ARDRC7826okF5FqoADoh433upmnhoahSTq"

curl -s http://127.0.0.1:20334/api/v1/node/version | jq .
curl -s http://127.0.0.1:20334/api/v1/block/height | jq .
curl -s http://127.0.0.1:20334/api/v1/block/details/height/1 | jq .
curl -s "http://127.0.0.1:20334/api/v1/balance/$ADDR" | jq .
```

---

## 11. HTTP Bootstrap & DNS Seeders

Tests for P2P peer discovery via the standalone bootstrap server and `p2pserver/protocols/bootstrap/bootstrap.go`.

### 11.1 Start the DNA bootstrap server

```bash
cd /workspaces/DNA

# Terminal A — standalone bootstrap (recommended)
./dnaNode bootstrap server \
  --listen 0.0.0.0:8090 \
  --seeds 127.0.0.1:20338,127.0.0.1:20438,127.0.0.1:20538,127.0.0.1:20638

# Or background:
nohup ./dnaNode bootstrap server --listen 0.0.0.0:8090 \
  --seeds 127.0.0.1:20338,127.0.0.1:20438,127.0.0.1:20538,127.0.0.1:20638 \
  > bootstrap.log 2>&1 &
```

Verify API:

```bash
curl -s http://127.0.0.1:8090/health | jq .
curl -s http://127.0.0.1:8090/peers | jq .
curl -s http://127.0.0.1:8090/status | jq .
```

Add to `config.json` (under `P2PNode`, base URL only):

```json
"P2PNode": {
  "HttpBootstrapServer": "http://127.0.0.1:8090"
}
```

Or pass via CLI: `--http-bootstrap-server http://127.0.0.1:8090`

The multi-node test script starts bootstrap automatically:

```bash
./scripts/run_multi_node_test.sh
```

| # | Test | Expected | Pass? |
|---|------|----------|-------|
| 11.1 | Bootstrap server starts | `listening on http://0.0.0.0:8090` in log | ☐ |
| 11.2 | `GET /peers` | JSON array of `host:port` strings | ☐ |
| 11.3 | Node starts with bootstrap URL | Log: `registered with http bootstrap server` | ☐ |
| 11.4 | Node still connects via SeedList + DHT | 3 peers when 4-node net running | ☐ |
| 11.5 | `DnsSeeders` with invalid host | Warning in log, no crash | ☐ |

Check logs:

```bash
grep -i bootstrap node1/node.log
curl -s http://127.0.0.1:8090/status | jq '.peerCount'
```

---

## 12. Asset & Balance Tests

| # | Test | Command | Expected | Pass? |
|---|------|---------|----------|-------|
| 12.1 | Balance by address | `asset balance <ADDR> --rpcport 20336` | `ONT:` and `GAS:` lines (not parse error) | ☐ |
| 12.2 | Balance by wallet index | `asset balance 1 --wallet node1/wallet.dat --rpcport 20336` | Same address resolved | ☐ |
| 12.3 | RPC balance | `getbalance` JSON-RPC | `gas` field present | ☐ |
| 12.4 | REST balance | `GET /api/v1/balance/<addr>` | JSON with balances | ☐ |

```bash
./dnaNode asset balance ARDRC7826okF5FqoADoh433upmnhoahSTq --rpcport 20336
./dnaNode asset balance 1 --wallet node1/wallet.dat --rpcport 20336
```

**Pass criteria:** No `strconv.ParseUint: parsing ""` error. ONT may be `0` on fresh networks.

---

## 13. Transaction Pipeline (Build / Sign / Send)

Set addresses from your wallets:

```bash
export FROM="ARDRC7826okF5FqoADoh433upmnhoahSTq"
export TO="ALMVNfjRsCiEjrgVdmV6pP5jgXgw2S28wo"
```

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 13.1 | Build raw tx | Long hex string in `tx.raw` | ☐ |
| 13.2 | `showtx` on raw | JSON with Hash, GasLimit, Payload | ☐ |
| 13.3 | Sign with `sigtx` | Signed hex (longer than raw) | ☐ |
| 13.4 | `sendtx` | TxHash returned (not duplicated error on first send) | ☐ |
| 13.5 | `info status <hash>` | State: 1 (success), Notify with transfer | ☐ |

```bash
cd /workspaces/DNA

# 1. Build
./dnaNode buildtx transfer \
  --wallet node1/wallet.dat \
  --from "$FROM" --to "$TO" \
  --amount 1 --asset gas 2>/dev/null | tail -1 > tx.raw

cat tx.raw
./dnaNode showtx "$(cat tx.raw)"

# 2. Sign (use --wallet-password and --hex-only to avoid polluting tx.signed)
./dnaNode sigtx --wallet node1/wallet.dat --account "$FROM" \
  --wallet-password 123456 --hex-only --rpcport 20336 "$(cat tx.raw)" > tx.signed

# Or sign and send in one step:
# ./dnaNode sigtx ... --sendtx

# 3. Send (sendtx also accepts output with info lines — extracts hex automatically)
./dnaNode sendtx --rpcport 20336 "$(cat tx.signed)"

# 4. Status — use TxHash from send output or showtx
./dnaNode info status <TX_HASH> --rpcport 20336
```

**Build approve / transferfrom:**

```bash
./dnaNode buildtx approve \
  --wallet node1/wallet.dat \
  --from "$FROM" --to "$TO" \
  --amount 10 --asset gas 2>/dev/null | tail -1

./dnaNode buildtx transferfrom \
  --wallet node1/wallet.dat \
  --from "$FROM" --to "$TO" \
  --amount 5 --asset gas 2>/dev/null | tail -1
```

---

## 14. Asset Commands (Direct Transfer / Approve)

These combine build + sign + broadcast in one step (password prompt).

| # | Command | Expected | Pass? |
|---|---------|----------|-------|
| 14.1 | `asset transfer` | TxHash printed, State 1 on status query | ☐ |
| 14.2 | `asset approve --asset gas` | TxHash printed (not `unsupport asset:gas`) | ☐ |
| 14.3 | `asset allowance` | Allowance amount shown | ☐ |
| 14.4 | `asset transferfrom` | Transfer succeeds after approve | ☐ |

```bash
# Transfer
./dnaNode asset transfer \
  --wallet node1/wallet.dat \
  --from "$FROM" --to "$TO" \
  --amount 1 --asset gas \
  --gasprice 0 --gaslimit 20000 \
  --rpcport 20336
# Password: 123456

# Approve
./dnaNode asset approve \
  --wallet node1/wallet.dat \
  --from "$FROM" --to "$TO" \
  --amount 10 --asset gas --rpcport 20336

# Allowance
./dnaNode asset allowance \
  --wallet node1/wallet.dat \
  --from "$FROM" --to "$TO" \
  --asset gas --rpcport 20336

# Transfer from allowance (sender = approved party)
./dnaNode asset transferfrom \
  --wallet node2/wallet.dat \
  --sender "$TO" --from "$FROM" --to "$TO" \
  --amount 5 --asset gas --rpcport 20336
```

---

## 15. Blockchain Explorer Commands

| # | Command | Expected | Pass? |
|---|---------|----------|-------|
| 15.1 | `info curblockheight` | Integer > 0 | ☐ |
| 15.2 | `info block 1` | Block JSON, Height: 1 | ☐ |
| 15.3 | `info block <hash>` | Same block by hash | ☐ |
| 15.4 | `info tx <hash>` | Transaction JSON | ☐ |
| 15.5 | `info status <hash>` | State + Notify events | ☐ |

```bash
./dnaNode info curblockheight --rpcport 20336
./dnaNode info block 1 --rpcport 20336
./dnaNode info tx <TX_HASH> --rpcport 20336
./dnaNode info status <TX_HASH> --rpcport 20336
```

---

## 16. Smart Contract Tests

### 16.1 NeoVM (.avm)

You need a compiled `.avm` file. If none exists locally, build from ontology/neovm samples or use any valid `.avm` bytecode file.

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 16.1 | `contract deploy --vmtype 1` | Contract Address + TxHash | ☐ |
| 16.2 | `info status` on deploy tx | State 1 | ☐ |
| 16.3 | `contract invoke` | TxHash, execution success | ☐ |
| 16.4 | `contract invoke --prepare` | Gas estimate, no commit | ☐ |

```bash
# Deploy (replace path with real .avm file)
./dnaNode contract deploy \
  --wallet node1/wallet.dat --rpcport 20336 \
  --code /path/to/contract.avm \
  --vmtype 1 \
  --name "MyContract" --version "1.0" \
  --author "dev" --email "dev@example.com" --desc "Test" \
  --gaslimit 20000000 --gasprice 0

# Invoke
./dnaNode contract invoke \
  --wallet node1/wallet.dat --rpcport 20336 \
  --address <CONTRACT_ADDRESS> \
  --params "string:hello" \
  --gaslimit 20000 --gasprice 0
```

### 16.2 WasmVM (.wasm)

```bash
# Build sample Rust wasm contract (if Rust toolchain available)
cd /workspaces/DNA/wasmtest/contracts-rust
# See wasmtest/contracts-rust/travis.build.sh for build steps

./dnaNode contract deploy \
  --wallet node1/wallet.dat --rpcport 20336 \
  --code /path/to/contract.wasm \
  --vmtype 3 \
  --name "HelloWasm" --version "1.0" \
  --author "dev" --email "dev@example.com" --desc "Wasm test" \
  --gaslimit 20000000 --gasprice 0
```

| # | Test | Expected | Pass? |
|---|------|----------|-------|
| 16.5 | Second invoke of same wasm contract | Faster execution (module cache warm) | ☐ |
| 16.6 | `contract invokecode` | Direct code execution | ☐ |

---

## 17. Validator Staking (stake / unstake)

Requires a validator pubkey from `account list -v` and sufficient GAS/ONT stake.

| # | Command | Expected | Pass? |
|---|---------|----------|-------|
| 17.1 | `asset stake --help` | Shows pubkey, from, amount flags | ☐ |
| 17.2 | `asset unstake --help` | Shows unstake options | ☐ |
| 17.3 | Stake transaction | TxHash returned | ☐ |
| 17.4 | Unstake transaction | TxHash returned | ☐ |

```bash
PUBKEY="021819e94bf1519c015d3af65b211e51e45497485851f68087f143ed4ef875dc2d"  # from node1 -v

./dnaNode asset stake \
  --wallet node1/wallet.dat \
  --pubkey "$PUBKEY" \
  --from "$FROM" \
  --amount 10000 \
  --rpcport 20336

./dnaNode asset unstake \
  --wallet node1/wallet.dat \
  --pubkey "$PUBKEY" \
  --from "$FROM" \
  --amount 1000 \
  --rpcport 20336
```

---

## 18. State Pruning (prune)

Prunes old block-hash index entries from the local block store. **Run only on a test node** — not production.

| # | Test | Expected | Pass? |
|---|------|----------|-------|
| 18.1 | `prune --help` | Shows `--keep-blocks`, `--data-dir` | ☐ |
| 18.2 | Dry run on stopped node | Summary of pruned entries | ☐ |

```bash
# Stop the node first, then:
./dnaNode prune \
  --data-dir /workspaces/DNA/node1/Chain \
  --keep-blocks 100
```

---

## 19. Blockchain Import / Export

| # | Test | Expected | Pass? |
|---|------|----------|-------|
| 19.1 | Export blocks 0–N | `Blocks_export.dat` created | ☐ |
| 19.2 | Import on fresh chain dir | Import completes without error | ☐ |

```bash
./dnaNode export \
  --rpcport 20336 \
  --exportfile /workspaces/DNA/Blocks_export.dat \
  --startheight 0 \
  --endheight 50

./dnaNode import \
  --importfile /workspaces/DNA/Blocks_export.dat \
  --data-dir /workspaces/DNA/node1/Chain \
  --config /workspaces/DNA/node1/config.json
```

---

## 20. Multisig Addresses

| # | Test | Expected | Pass? |
|---|------|----------|-------|
| 20.1 | Generate 2-of-3 multisig | Multisig address printed | ☐ |

```bash
# Collect 3 pubkeys from wallets
./dnaNode multisigaddr -m 2 \
  --pubkey "<pubkey1>,<pubkey2>,<pubkey3>"
```

---

## 21. Signing Server (sigsvr)

HTTP signing API so callers never handle the wallet file directly.

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 21.1 | Import wallet to sigsvr | Success message | ☐ |
| 21.2 | Start sigsvr on :20000 | Server listening | ☐ |
| 21.3 | POST `/api/v1/sigrawtx` | Signed tx in response | ☐ |

```bash
cd /workspaces/DNA

./tools/sigsvr import \
  --walletdir node1/sig_wallet \
  --wallet node1/wallet.dat

./tools/sigsvr \
  --walletdir node1/sig_wallet \
  --cliport 20000

# Sign raw tx
curl -s -X POST http://127.0.0.1:20000/api/v1/sigrawtx \
  -H 'Content-Type: application/json' \
  -d '{
    "qid":"1",
    "method":"sigrawtx",
    "account":"ARDRC7826okF5FqoADoh433upmnhoahSTq",
    "pwd":"123456",
    "params":{"raw_tx":"<RAW_HEX_FROM_tx.raw>"}
  }' | jq .
```

---

## 22. Python Dashboard (port 8080)

Legacy control panel wrapping CLI via Python HTTP server.

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 22.1 | Start server | `Listening on http://0.0.0.0:8080` | ☐ |
| 22.2 | `GET /api/health` | Nodes array, latestBlock | ☐ |
| 22.3 | Browser UI loads | Dashboard visible | ☐ |
| 22.4 | Wallet create via API | `ok: true` | ☐ |
| 22.5 | Asset transfer via API | stdout contains TxHash | ☐ |

```bash
cd /workspaces/DNA/dashboard
python3 server.py

# Another terminal
curl -s http://127.0.0.1:8080/api/health | jq .

curl -s -X POST http://127.0.0.1:8080/api/wallet/list \
  -H 'Content-Type: application/json' \
  -d '{"walletPath":"/workspaces/DNA/node1/wallet.dat","password":"123456"}' | jq .
```

Open http://localhost:8080 in a browser.

---

## 23. Next.js Frontend Dashboard (port 3000)

Modern green-themed UI with API layer at `/api/*`.

### 23.1 Setup & boot

```bash
cd /workspaces/DNA/dna-frontend
npm install
npm run clean    # if prior build errors
npm run dev
# → http://localhost:3000
```

| # | Test | Expected | Pass? |
|---|------|----------|-------|
| 23.1 | `GET /api/health` | `ok: true`, nodes[], latestBlock | ☐ |
| 23.2 | Dashboard loads | Block height, node cards, green theme | ☐ |
| 23.3 | Heights auto-refresh | Numbers update every ~8s | ☐ |

```bash
curl -s http://127.0.0.1:3000/api/health | jq .
```

### 23.2 Page-by-page UI tests

#### Dashboard `/`

| # | Action | Expected | Pass? |
|---|--------|----------|-------|
| 23.4 | Open dashboard | Network status banner, metric cards, chart | ☐ |
| 23.5 | Click "Manage nodes" | Navigates to /nodes | ☐ |
| 23.6 | Quick action "Send GAS" | Opens /transactions | ☐ |
| 23.7 | Search bar — enter block `1` | Routes to explorer | ☐ |
| 23.8 | Search bar — enter tx hash | Routes to explorer tx view | ☐ |

#### Nodes `/nodes`

| # | Action | Expected | Pass? |
|---|--------|----------|-------|
| 23.9 | Status tab | 4 nodes with heights & peer counts | ☐ |
| 23.10 | Logs tab | Log lines from `node1/node.log` | ☐ |
| 23.11 | Topology tab | Visual node layout | ☐ |
| 23.12 | Config tab | Startup command reference | ☐ |
| 23.13 | Start Network button | Launch script triggered | ☐ |
| 23.14 | Stop Network button | Stop signal sent | ☐ |

#### Wallets `/wallets`

| # | Action | Expected | Pass? |
|---|--------|----------|-------|
| 23.15 | Accounts tab | ONT + GAS balances per account | ☐ |
| 23.16 | Create Account | New account appears after refresh | ☐ |
| 23.17 | Import / Export tab | CLI-backed actions respond | ☐ |
| 23.18 | Copy address button | Clipboard contains full address | ☐ |

#### Transactions `/transactions`

| # | Action | Expected | Pass? |
|---|--------|----------|-------|
| 23.19 | Transfer tab — send 1 GAS | TxHash in success message | ☐ |
| 23.20 | Approve tab | Approve tx succeeds | ☐ |
| 23.21 | Pipeline — Build / Sign / Send | Each step returns hex output | ☐ |
| 23.22 | Lookup — query tx hash | Status JSON displayed | ☐ |
| 23.23 | History tab | Entry appears after transfer | ☐ |

#### Contracts `/contracts`

| # | Action | Expected | Pass? |
|---|--------|----------|-------|
| 23.24 | Deploy tab — valid wasm/avm path | Contract address in response | ☐ |
| 23.25 | Registry shows deployed contract | Name + address listed | ☐ |
| 23.26 | Invoke tab | TxHash on successful invoke | ☐ |
| 23.27 | Guide tab | VM type / param format docs | ☐ |

#### Contacts `/contacts`

| # | Action | Expected | Pass? |
|---|--------|----------|-------|
| 23.28 | Add contact | Appears in grid | ☐ |
| 23.29 | Search filter | Filters by label/address | ☐ |
| 23.30 | Export JSON | File downloads | ☐ |
| 23.31 | Delete contact | Removed from list | ☐ |

#### Explorer `/explorer`

| # | Action | Expected | Pass? |
|---|--------|----------|-------|
| 23.32 | Block query `1` | Block JSON in result panel | ☐ |
| 23.33 | Prev / Next block buttons | Height increments/decrements | ☐ |
| 23.34 | Quick query "Block Count" | RPC result shown | ☐ |
| 23.35 | Transaction hash lookup | Tx details shown | ☐ |

#### Help `/help`

| # | Action | Expected | Pass? |
|---|--------|----------|-------|
| 23.36 | CLI Commands sections expand | Command examples visible | ☐ |
| 23.37 | API Reference tab | Frontend API routes listed | ☐ |
| 23.38 | Network Setup tab | VBFT setup instructions | ☐ |

#### Settings `/settings`

| # | Action | Expected | Pass? |
|---|--------|----------|-------|
| 23.39 | Change wallet path + Save | Persisted in localStorage | ☐ |
| 23.40 | RPC port reference cards | Shows 20336–20636 | ☐ |

### 23.3 Frontend API spot checks

```bash
# Health
curl -s http://127.0.0.1:3000/api/health | jq .

# Wallet list
curl -s -X POST http://127.0.0.1:3000/api/wallets \
  -H 'Content-Type: application/json' \
  -d '{"action":"list","walletPath":"/workspaces/DNA/node1/wallet.dat","password":"123456"}' | jq .

# Balance
curl -s "http://127.0.0.1:3000/api/wallets?address=ARDRC7826okF5FqoADoh433upmnhoahSTq&rpcPort=20336" | jq .

# Block
curl -s "http://127.0.0.1:3000/api/blockchain/block?q=1&rpcPort=20336" | jq .

# RPC proxy
curl -s -X POST http://127.0.0.1:3000/api/rpc \
  -H 'Content-Type: application/json' \
  -d '{"method":"getconnectioncount","params":[],"rpcPort":20336}' | jq .

# Contacts
curl -s http://127.0.0.1:3000/api/contacts | jq .

# Node logs
curl -s "http://127.0.0.1:3000/api/nodes?id=node1" | jq '.lines | length'
```

---

## 24. Automated Feature Test Script

Runs static + live checks for new DNA features (ONT token, bootstrap config, staking, rewards, prune, upgrade contract, wasm cache).

```bash
cd /workspaces/DNA
chmod +x test_features.sh
./test_features.sh
```

| # | Feature area | Pass? |
|---|--------------|-------|
| 24.1 | R1 — ONT governance token in balance | ☐ |
| 24.2 | R2 — HTTP bootstrap & DNS seeder config | ☐ |
| 24.3 | R3 — stake / unstake CLI | ☐ |
| 24.4 | R4 — block rewards in ledger | ☐ |
| 24.5 | R5 — prune command | ☐ |
| 24.6 | R6 — contract upgradability native contract | ☐ |
| 24.7 | R7 — Wasm module cache | ☐ |
| 24.8 | Clean compile | ☐ |

**Expected:** `All tests passed!` and exit code 0.

---

## 25. Troubleshooting Matrix

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `CurrentBlockHeight: 0` forever | Missing `--enable-consensus` | Restart with `--enable-consensus --password <pw>` |
| `decrypt private key error` | Wrong password | Use correct `--password` |
| `strconv.ParseUint: parsing ""` on balance | Old binary or empty ONT field | Rebuild `dnaNode`; balance treats empty as 0 |
| `unsupport asset:gas` on approve | Old CLI | Rebuild; use `--asset gas` |
| `ErrDuplicatedTx` on sendtx | Same signed tx resubmitted | Build fresh tx (new nonce) |
| `flag provided but not defined: -needstore` | Invalid deploy flag | Remove `--needstore` from deploy command |
| `lookup 127.0.0.01: no such host` | SeedList typo | Use `127.0.0.1` |
| `address already in use` | Port conflict | `fuser -k 20336/tcp` or change ports |
| Nodes connect, no blocks | No password / no consensus | Add `--password` + `--enable-consensus` |
| Frontend `Cannot find module './276.js'` | Corrupt `.next` cache | `npm run clean && npm run dev` |
| Frontend shows 0/4 nodes | Nodes not running | Run `./scripts/run_multi_node_test.sh` |
| `read code: no such file` on deploy | Placeholder contract path | Provide real `.avm` or `.wasm` file |
| `Cannot get SmartContractEvent` on unsigned tx | Tx never landed on chain | Only query hashes from successful `sendtx` |

---

## 26. Test Session Log Template

Copy and fill in for each test run:

```
Date:
Tester:
Branch / commit:
dnaNode version:

[ ] Build (Section 2)
[ ] Multi-node network up (Section 5)
[ ] Consensus syncing (Section 8)
[ ] JSON-RPC (Section 9)
[ ] REST API (Section 10)
[ ] Balance queries (Section 12)
[ ] GAS transfer (Section 14)
[ ] Approve + allowance (Section 14)
[ ] Contract deploy (Section 16)
[ ] Frontend dashboard (Section 23)

Notes:
Block height at start:
Block height at end:
Tx hashes tested:

Issues found:
1.
2.
```

---

## Quick Reference — Full Test Run Order

For a complete regression from zero:

```bash
# 1. Build
cd /workspaces/DNA && make

# 2. Feature script (offline + live)
./test_features.sh

# 3. Start 4-node network
./scripts/run_multi_node_test.sh

# 4. CLI smoke
./dnaNode info curblockheight --rpcport 20336
./dnaNode asset balance 1 --wallet node1/wallet.dat --rpcport 20336

# 5. Transfer
./dnaNode asset transfer --wallet node1/wallet.dat \
  --from <FROM> --to <TO> --amount 1 --asset gas --rpcport 20336

# 6. Frontend
cd dna-frontend && npm run clean && npm run dev
# Browser: http://localhost:3000 — walk through Section 23

# 7. Optional: Python dashboard
cd ../dashboard && python3 server.py
# Browser: http://localhost:8080

# 8. Stop
pkill -f 'dnaNode --config config.json' || true
```

---

*See also: [GUIDE.md](GUIDE.md) for detailed command reference, [dna-frontend/README.md](dna-frontend/README.md) for frontend setup.*
