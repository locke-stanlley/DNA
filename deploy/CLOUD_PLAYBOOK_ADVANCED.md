# DNA Network: Advanced Cloud Test Cases

Now that the core network is running and validated, here are detailed test cases to exercise the advanced features of the DNA blockchain over the Render cloud network.

*(Note: Ensure your `local_proxy.py` is running on port 20336 and your `$USER1`, `$USER2`, etc., variables are loaded in your terminal before running these).*

---

## Test Case 1: Querying the Ledger (Blocks and Transactions)
Verify that the blockchain ledger is accurately recording data and that you can query historical data.

### 1.1 Fetch the Genesis Block
The genesis block (Block 0) contains the hardcoded configuration and initial asset distribution.
```bash
./dnaNode info block 0 --rpcport 20336
```
**Expected Outcome**: A large JSON payload showing the block header, the `NextBookkeeper` address, and the initial `RegisterAsset` transactions for ONT and GAS.

### 1.2 Fetch the Latest Block
Get the exact details of the most recently minted block:
```bash
# Get the current height first
HEIGHT=$(./dnaNode info curblockheight --rpcport 20336 | grep -o '[0-9]*')
# Fetch the block by height
./dnaNode info block $HEIGHT --rpcport 20336
```
**Expected Outcome**: A JSON payload showing the recent transactions (like your contract deployment or GAS transfer).

### 1.3 Transaction Status
Find a `TxHash` from any of your previous transactions (like the 50 GAS transfer) and query its exact status.
```bash
export TX_HASH="<REPLACE_WITH_YOUR_TX_HASH>"
./dnaNode info status $TX_HASH --rpcport 20336
```
**Expected Outcome**: It should display `"State": 1` (Success) and how much GAS was consumed during execution.

---

## Test Case 2: Native Asset Transfers (ONT vs GAS)
DNA has a dual-token model. **ONT** is indivisible (must be whole numbers) and used for staking/governance. **GAS** is divisible and used for paying transaction fees.

### 2.1 Attempt an Indivisible ONT Transfer
Let's try to send `0.5` ONT. Because ONT is indivisible, the network should reject this mathematically invalid transaction.
```bash
./dnaNode buildtx transfer \
  --wallet Wallets/user1.dat --from "$USER1" --to "$USER2" \
  --amount 0.5 --asset ont 2>/dev/null | tail -1 > invalid_tx.raw

./dnaNode sigtx \
  --wallet Wallets/user1.dat --wallet-password "123456" \
  --send "$(cat invalid_tx.raw)" --rpcport 20336
```
**Expected Outcome**: The node should return an error indicating `invalid amount` or `indivisible asset`.

### 2.2 Valid ONT Transfer
Now, transfer a valid, whole amount of ONT (Note: Only the Genesis Multi-Sig holds ONT initially, so you must use it as the source).
```bash
export MULTISIG="AWNwv764Dj1BM2KuvRXeVhbGSUqgokrwnJ"

./dnaNode buildtx transfer \
  --from "$MULTISIG" --to "$USER1" \
  --amount 500 --asset ont 2>/dev/null | tail -1 > ont_tx.raw

./dnaNode multisigtx --wallet node1/wallet.dat -m 4 --pubkey "$VAL_PUBS_5" \
  --wallet-password "123456" --hex-only "$(cat ont_tx.raw)" > ont.sig1
./dnaNode multisigtx --wallet node2/wallet.dat -m 4 --pubkey "$VAL_PUBS_5" \
  --wallet-password "123456" --hex-only "$(cat ont.sig1)" > ont.sig2
./dnaNode multisigtx --wallet node3/wallet.dat -m 4 --pubkey "$VAL_PUBS_5" \
  --wallet-password "123456" --hex-only "$(cat ont.sig2)" > ont.sig3
./dnaNode multisigtx --wallet node4/wallet.dat -m 4 --pubkey "$VAL_PUBS_5" \
  --wallet-password "123456" --send "$(cat ont.sig3)" --rpcport 20336
```
Wait a few seconds, then check balances:
```bash
./dnaNode asset balance $USER1 --rpcport 20336
```
**Expected Outcome**: `ONT: 500` will now appear in User1's wallet.

---

## Test Case 3: Advanced Smart Contract Execution (OEP-4 Token Transfer)
You previously deployed the `MyCloudToken` contract and verified User1 holds `1,000,000,000` tokens using `--prepare` mode (read-only). Now, let's actually execute a state-changing transaction on the ledger to transfer those tokens!

### 3.1 Execute the Token Transfer
We will transfer `5,000` OEP-4 tokens from User1 to User2. Because this modifies the contract state, we must cryptographically sign it and broadcast it (we cannot use `--prepare`).

```bash
# Verify your CONTRACT_ADDR is set
echo $CONTRACT_ADDR

# Execute the transfer (Invoking stateful contract logic)
./dnaNode contract invoke \
  --wallet Wallets/user1.dat --account "$USER1" \
  --address "$CONTRACT_ADDR" \
  --vmtype 1 \
  --params "string:transfer,[bytearray:$USER1_HEX,bytearray:$USER2_HEX,int:5000]" \
  --gasprice 0 --gaslimit 200000 --rpcport 20336
```
*(Enter your wallet password `123456` when prompted).*

### 3.2 Verify the New Balances (Read-Only Query)
Wait a few seconds for the block to be minted, then use the free `--prepare` mode to query both balances directly from the contract's storage.

**Check User1 (Should be 1,000,000,000 - 5,000):**
```bash
./dnaNode contract invoke \
  --wallet Wallets/user1.dat --address "$CONTRACT_ADDR" \
  --vmtype 1 --params "string:balanceOf,[bytearray:$USER1_HEX]" \
  --prepare --return int --rpcport 20336
```

**Check User2 (Should be exactly 5,000):**
```bash
./dnaNode contract invoke \
  --wallet Wallets/user2.dat --address "$CONTRACT_ADDR" \
  --vmtype 1 --params "string:balanceOf,[bytearray:$USER2_HEX]" \
  --prepare --return int --rpcport 20336
```

---

## Test Case 4: Raw HTTP JSON-RPC Interaction
The DNA nodes on Render natively expose a JSON-RPC HTTP server. Instead of using the `dnaNode` CLI, applications (like a web wallet or block explorer) interact with the network using raw JSON payloads.

Open a new terminal (no local proxy needed) and send an RPC payload directly to your Render URL:

```bash
curl -s -X POST https://dna-network.onrender.com/ \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "getblockcount",
    "params": [],
    "id": 1
  }' | jq
```
**Expected Outcome**: A raw JSON response indicating the current network block height. This proves your cloud network is ready to be connected to front-end applications!
