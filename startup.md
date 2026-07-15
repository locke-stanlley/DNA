# DNA 5-Node Validator Consensus Network Startup Guide

This document describes how to launch the 5-node DNA consensus network, explains the genesis allocation of funds, and shows how to perform multi-signature transactions to distribute the genesis funds to individual accounts.

---

## 1. Genesis Allocation and Balances

In a 5-node consensus network, the entire initial genesis supply of **1,000,000,000 ONT** and **1,000,000,000 GAS** is allocated to a **4-of-5 Multi-Signature Address** built from the public keys of all 5 genesis validators.

### M-of-N Multi-Signature Formula
The minimum signatures $M$ required for genesis consensus actions is calculated as:
$$M = \frac{5N + 6}{7}$$
For $N = 5$ validators, $M = \frac{25 + 6}{7} = 4$.

### Network Addresses and Public Keys
Below is the list of public keys, wallet addresses, and ports for the 5 validator nodes:

| Node | P2P Port | RPC Port | Wallet Address | Consensus Public Key |
|---|---|---|---|---|
| **Node 1** | `20338` | `20336` | `AX3LEE3rUhinSjcyW5R6Cz6NZZKA16RTMM` | `03603f114619cd06c1d04142d2c00a10e8fb3a668245b8105b5c095bf26cd8edde` |
| **Node 2** | `20438` | `20436` | `ASsynsUiDCmdGSbAMXgyz6uGDc4EKYpuao` | `02f86ca933f69c4109ea936dff7d8507e41618500dbd376dd72e011afa6ac577be` |
| **Node 3** | `20538` | `20536` | `ARu8bPLsFFgTzUJHs2i8xN5bp6aVF5TnfY` | `0314556d5690d073d4699d719108b583c72be2c30bda56bbfdd58e21f261cd8ec7` |
| **Node 4** | `20638` | `20636` | `AdQ9w5GTmjDGCyWAAwhusNaTnCzcnqgf4k` | `03929c5ceef5e5211910e04ae309c1b623fcb9b118ebb482cf0d02c028d3ec3a57` |
| **Node 5** | `20738` | `20736` | `AdLxFR53J7MGDv1LdfLzxGXpqQZ4xoY1qS` | `03e4ca87bb7170539c76a6da64900c960f37946e436802b7ba7f69e170c333f3b4` |

* **Genesis Multi-Signature Address**: `AWNwv764Dj1BM2KuvRXeVhbGSUqgokrwnJ`
* **Genesis Multi-Signature Script Hash**: `a033e21fa837d3a24bb75f3269d90c1c3f91ed83`

> [!NOTE]
> Individual accounts start with a balance of `0`. To fund them, you must transfer gas from the genesis multi-signature address by signing the transaction with at least **4 out of 5** of the validator keys.

---

## 2. Launching the Network

### Step 1: Clean Mismatched Chain Data
If consensus parameters or validators list are updated, clean the old chain database directory of all nodes to avoid block hash mismatch:
```bash
rm -rf /workspaces/DNA/node*/Chain
```

### Step 2: Start the HTTP Bootstrap Server
Launch the bootstrap server, providing the ports of all 5 validators:
```bash
./dnaNode bootstrap server --listen 0.0.0.0:8090 --seeds 127.0.0.1:20338,127.0.0.1:20438,127.0.0.1:20538,127.0.0.1:20638,127.0.0.1:20738
```

### Step 3: Start Node 1 through Node 5
Run each node in its respective folder (or in separate terminal tabs):

#### Node 1
```bash
cd /workspaces/DNA/node1
./dnaNode --config http://127.0.0.1:8090/genesis-config --data-dir Chain --wallet wallet.dat --nodeport 20338 --rpcport 20336 --restport 20334 --wsport 20335 --rest --ws --password 123456 --enable-consensus
```

#### Node 2
```bash
cd /workspaces/DNA/node2
./dnaNode --config http://127.0.0.1:8090/genesis-config --data-dir Chain --wallet wallet.dat --nodeport 20438 --rpcport 20436 --restport 20434 --wsport 20435 --password 123456 --enable-consensus
```

#### Node 3
```bash
cd /workspaces/DNA/node3
./dnaNode --config http://127.0.0.1:8090/genesis-config --data-dir Chain --wallet wallet.dat --nodeport 20538 --rpcport 20536 --restport 20534 --wsport 20535 --password 123456 --enable-consensus
```

#### Node 4
```bash
cd /workspaces/DNA/node4
./dnaNode --config http://127.0.0.1:8090/genesis-config --data-dir Chain --wallet wallet.dat --nodeport 20638 --rpcport 20636 --restport 20634 --wsport 20635 --password 123456 --enable-consensus
```

#### Node 5
```bash
cd /workspaces/DNA/node5
./dnaNode --config http://127.0.0.1:8090/genesis-config --data-dir Chain --wallet wallet.dat --nodeport 20738 --rpcport 20736 --restport 20734 --wsport 20735 --password 123456 --enable-consensus
```

---

## 3. Querying Balances

To check the balance of any wallet address or the genesis multi-signature address, use:
```bash
./dnaNode asset balance <address> --rpcport 20336
```

Example output for the multi-signature address:
```text
BalanceOf:AWNwv764Dj1BM2KuvRXeVhbGSUqgokrwnJ
  ONT:1000000000
  GAS:1000000000
```

---

## 4. Multi-Signature Transfer Command Guide

Because the genesis funds are secured in a 4-of-5 multi-signature contract, distributing them requires building a raw transaction and signing it sequentially on 4 different validator wallets before broadcasting it to the network.

Here is the exact automated script to build, sign, and broadcast a transfer transaction:

```bash
# 1. Define variables (Public Keys list must be exact and separated with comma)
PUBKEYS="03603f114619cd06c1d04142d2c00a10e8fb3a668245b8105b5c095bf26cd8edde,02f86ca933f69c4109ea936dff7d8507e41618500dbd376dd72e011afa6ac577be,0314556d5690d073d4699d719108b583c72be2c30bda56bbfdd58e21f261cd8ec7,03929c5ceef5e5211910e04ae309c1b623fcb9b118ebb482cf0d02c028d3ec3a57,03e4ca87bb7170539c76a6da64900c960f37946e436802b7ba7f69e170c333f3b4"
FROM="AWNwv764Dj1BM2KuvRXeVhbGSUqgokrwnJ"
TO="ARDRC7826okF5FqoADoh433upmnhoahSTq"   # Target wallet address
AMOUNT="1000000"                          # Amount of Gas to transfer

# 2. Build the Raw Transaction
TX=$(./dnaNode buildtx transfer \
  --wallet node1/wallet.dat \
  --from "$FROM" \
  --to "$TO" \
  --amount "$AMOUNT" \
  --asset gas | grep -o -E '[0-9a-fA-F]{40,}')

# 3. Sign with Validator 1 (Node 1)
TX1=$(echo "123456" | ./dnaNode multisigtx --wallet node1/wallet.dat -m 4 --pubkey "$PUBKEYS" "$TX" | grep -o -E '[0-9a-fA-F]{40,}')

# 4. Sign with Validator 2 (Node 2)
TX2=$(echo "123456" | ./dnaNode multisigtx --wallet node2/wallet.dat -m 4 --pubkey "$PUBKEYS" "$TX1" | grep -o -E '[0-9a-fA-F]{40,}')

# 5. Sign with Validator 3 (Node 3)
TX3=$(echo "123456" | ./dnaNode multisigtx --wallet node3/wallet.dat -m 4 --pubkey "$PUBKEYS" "$TX2" | grep -o -E '[0-9a-fA-F]{40,}')

# 6. Sign with Validator 4 (Node 4) and Broadcast to network
echo "123456" | ./dnaNode multisigtx --wallet node4/wallet.dat -m 4 --pubkey "$PUBKEYS" --send "$TX3" --rpcport 20336
```
