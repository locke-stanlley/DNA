# Real-World Use Case Playbook: DNA Network Case Scenario

This guide outlines a comprehensive end-to-end simulation of a real-world mainnet use case on the DNA blockchain network. 

## Scenario Overview
We assume a 10-user network where participants manage their own local wallets, carry out peer-to-peer asset transfers, deploy a custom **OEP-4 Token Contract (`MyToken`)**, initialize the token supply, and execute smart contract-based token transfers.

---

## 1. Network Users Directory
Here are the 10 simulated users, including their wallet filenames, addresses, public keys, and default password (`123456`).

| User Label | Wallet File | Base58 Wallet Address | Public Key Hex |
| :--- | :--- | :--- | :--- |
| **User1 (Funder/Owner)** | `user1.dat` | `AXXTe7hLX2TYxC6uEgET8G1emFEKEhFvPg` | `02f218da3ad51a1b1e9be3b477660ca401e329966f72267d74c304664dcba4d01f` |
| **User2** | `user2.dat` | `APYAXgfNh5Z5UVZub4dbDTQM9kMbfZqzKH` | `02ff1dbd76598ea531e4ca3efa02dc79c20e23d40d94d1d0721410ecdbf105cddc` |
| **User3** | `user3.dat` | `AetBhxj81AY8T7NixrU21dKwxJ5aP9QhwK` | `02288bb2056baf22484bdae1c39c428b8ad119cc7e8d26e8bb1fb388d593ca08d6` |
| **User4** | `user4.dat` | `Aco3jXGWhKnEuiCGhhSDhSrJBryFfZNVzp` | `0282ce614ebd9fb3937897f65eba064fb808a8c41881b111161847bd2cf66b0d39` |
| **User5** | `user5.dat` | `ATALXikws99NmFmhF7YvYp4u1cznVvzu5t` | `02dec28fb595ecf6f82fcf928c2f3c5f927b307a07e44c1d5dc881352983d738e6` |
| **User6** | `user6.dat` | `AWXrKyt1hSrwS1t99zL6LJCdku6xBEHy3i` | `02c894aa6d78b2faac6591207bec02a7bc092f200f4b3ec2569c439cd45aa58b00` |
| **User7** | `user7.dat` | `AJSkxaYLNdMxPzrxEMpdjTLPU9wRAd3UBT` | `03ae61c9815663a6200855092fcc8133dd03a062bb96c28685ca81422bd7b52537` |
| **User8** | `user8.dat` | `ATUugmZ3u17CizKnpQFzhNc9gANwsLuiU4` | `03987eb01b6db2da96a350e40825ed4f64f378880282a3d8d575c0814ebd24bc6b` |
| **User9** | `user9.dat` | `AVRuRHRGMMP6S68k26hfGXR3ahpaXpgz84` | `02c0b2f88ee5d2c977adf9ec3e35188af5741469ec0bd1b778f61e7ff2ca90f0c3` |
| **User10** | `user10.dat` | `AJTay3KcDVBYwFWZhVhWN4zzLS7Q8TjNp3` | `03e28181cc26891c43d56be011afff35fc46f317a275ddd79af2c09e28e9d01d22` |

---

## 2. Step-by-Step Playbook

### Step 1: Wallet Creation for all 10 Users
Create a directory to store user wallets, and generate keypairs with default settings (`ecdsa`, `P-256`, `SHA256withECDSA`).

```bash
mkdir -p Wallets

# Generate 10 separate wallet files
for i in {1..10}; do
  echo -e "123456\n123456" | ./dnaNode account add -d --wallet Wallets/user${i}.dat --label user${i}
done
```

---

### Step 1.5: Dynamically Load User Addresses
After generating the 10 wallets, run this bash snippet to extract their addresses and assign them to environment variables (`USER1` to `USER10`) so they can be referenced in subsequent commands:

```bash
# Dynamically extract and assign user addresses
for i in {1..10}; do
  addr=$(./dnaNode account list --wallet Wallets/user${i}.dat | grep -o 'Address:[^ ]*' | cut -d: -f2)
  export USER${i}="$addr"
  echo "USER${i}=$addr"
done
```

---

### Step 2: Multi-Sig Funding (Validator to User1)
On network genesis, 100% of the GAS supply (`1,000,000,000` GAS) is allocated to the **4-of-5 Multi-Signature address** (`AWNwv764Dj1BM2KuvRXeVhbGSUqgokrwnJ`) composed of the validator public keys.

We will build a transfer transaction of `500,000` GAS to **User1**, gather signatures from Validator 1, 2, 3, and 4, and broadcast it.

```bash
# 1. Set environment variables (USER1 is already loaded in Step 1.5)
export MULTISIG="AWNwv764Dj1BM2KuvRXeVhbGSUqgokrwnJ"

# Comm-separated public keys of all 5 validators:
export VAL_PUBS="03603f114619cd06c1d04142d2c00a10e8fb3a668245b8105b5c095bf26cd8edde,02f86ca933f69c4109ea936dff7d8507e41618500dbd376dd72e011afa6ac577be,0314556d5690d073d4699d719108b583c72be2c30bda56bbfdd58e21f261cd8ec7,03929c5ceef5e5211910e04ae309c1b623fcb9b118ebb482cf0d02c028d3ec3a57,03e4ca87bb7170539c76a6da64900c960f37946e436802b7ba7f69e170c333f3b4"

# 2. Build the unsigned transaction
./dnaNode buildtx transfer \
  --from "$MULTISIG" --to "$USER1" \
  --amount 500000 --asset gas 2>/dev/null | tail -1 > tx.raw

# 3. Sign the transaction sequentially across validator wallets
# Sign with Validator 1
./dnaNode multisigtx --wallet node1/wallet.dat -m 4 --pubkey "$VAL_PUBS" \
  --wallet-password "123456" --hex-only "$(cat tx.raw)" > tx.sig1

# Sign with Validator 2
./dnaNode multisigtx --wallet node2/wallet.dat -m 4 --pubkey "$VAL_PUBS" \
  --wallet-password "123456" --hex-only "$(cat tx.sig1)" > tx.sig2

# Sign with Validator 3
./dnaNode multisigtx --wallet node3/wallet.dat -m 4 --pubkey "$VAL_PUBS" \
  --wallet-password "123456" --hex-only "$(cat tx.sig2)" > tx.sig3

# Sign with Validator 4 (and broadcast)
./dnaNode multisigtx --wallet node4/wallet.dat -m 4 --pubkey "$VAL_PUBS" \
  --wallet-password "123456" --send "$(cat tx.sig3)"
```

---

### Step 3: Funder Distributes GAS to Users 2–10
Now that **User1** has `500,000` GAS, they can act as the network onboarding funder and send `10,000` GAS to each of the other users.

```bash
# User addresses USER2 to USER10 are dynamically loaded in Step 1.5.
# If they are not in your environment, run the Step 1.5 loop first.

# Build, sign, and broadcast transfers from User 1
for addr in "$USER2" "$USER3" "$USER4" "$USER5" "$USER6" "$USER7" "$USER8" "$USER9" "$USER10"; do
  ./dnaNode buildtx transfer \
    --wallet Wallets/user1.dat --from "$USER1" --to "$addr" \
    --amount 10000 --asset gas 2>/dev/null | tail -1 > tx_transfer.raw
  
  ./dnaNode sigtx --wallet Wallets/user1.dat --wallet-password "123456" --send "$(cat tx_transfer.raw)"
done
```

Verify **User2**'s balance:
```bash
./dnaNode asset balance "$USER2" --rpcport 20336
```
> [!NOTE]
> It should display:
> ```text
> BalanceOf:APYAXgfNh5Z5UVZub4dbDTQM9kMbfZqzKH
>   ONT:0
>   GAS:10000
> ```

---

### Step 4: Active P2P Peer Transactions
Users can now transfer assets between each other to simulate network traffic. Let's execute a cascading transfer chain:
* User2 $\rightarrow$ User3 (`500` GAS)
* User3 $\rightarrow$ User4 (`300` GAS)
* User4 $\rightarrow$ User5 (`200` GAS)

```bash
# 1. User 2 to User 3
./dnaNode buildtx transfer --wallet Wallets/user2.dat --from "$USER2" --to "$USER3" --amount 500 --asset gas 2>/dev/null | tail -1 > p2p.raw
./dnaNode sigtx --wallet Wallets/user2.dat --wallet-password "123456" --send "$(cat p2p.raw)"

# 2. User 3 to User 4
./dnaNode buildtx transfer --wallet Wallets/user3.dat --from "$USER3" --to "$USER4" --amount 300 --asset gas 2>/dev/null | tail -1 > p2p.raw
./dnaNode sigtx --wallet Wallets/user3.dat --wallet-password "123456" --send "$(cat p2p.raw)"

# 3. User 4 to User 5
./dnaNode buildtx transfer --wallet Wallets/user4.dat --from "$USER4" --to "$USER5" --amount 200 --asset gas 2>/dev/null | tail -1 > p2p.raw
./dnaNode sigtx --wallet Wallets/user4.dat --wallet-password "123456" --send "$(cat p2p.raw)"
```

---

### Step 5: Deploy the Custom OEP-4 Token Contract (`MyToken`)
The contract deployment command expects the contract code to be a **hex-encoded ASCII string**, not raw binary bytecode. Since `wasmtest/contracts-cplus/test_oep4.avm` is in raw binary format, we must convert it to a hex string file first:

```bash
# Convert raw binary bytecode to hex-encoded ASCII
xxd -p -c 0 wasmtest/contracts-cplus/test_oep4.avm | tr -d '\n' > wasmtest/contracts-cplus/test_oep4.hex
```

Now we deploy the custom contract:
* **Name**: MyToken
* **Symbol**: MYT
* **Decimals**: 8
* **Owner/Author**: User1

```bash
./dnaNode contract deploy \
  --wallet Wallets/user1.dat --account "$USER1" \
  --vmtype 1 \
  --code wasmtest/contracts-cplus/test_oep4.hex \
  --name "MyToken" --version "1.0" \
  --author "$USER1" --email "funder@dna.org" --desc "OEP4 Token Deployment Case Study" \
  --gasprice 0 --gaslimit 20000000 --rpcport 20336
```
> [!IMPORTANT]
> The transaction will succeed and print the deployed **contract address** in the terminal:
> ```text
> Deploy contract address: d2f8bc6933f69c4109ea936dff7d8507e4161850 (example hash)
> ```
> *Note down this address for the next steps! We will refer to it as `$CONTRACT_ADDR`.*

```bash
# Set your deployed contract address
export CONTRACT_ADDR="d2f8bc6933f69c4109ea936dff7d8507e4161850"
```

---

### Step 6: Initialize the Token Contract
To distribute the initial supply of `1,000,000,000` tokens (`MYT`) to the contract Owner (**User1**), we must invoke the contract's `init` method.

```bash
./dnaNode contract invoke \
  --wallet Wallets/user1.dat --account "$USER1" \
  --address "$CONTRACT_ADDR" \
  --vmtype 1 \
  --params string:init,[] \
  --gasprice 0 --gaslimit 200000 --rpcport 20336
```

---

### Step 7: Query Smart Contract Metadata & Balances
We can invoke the contract in **prepare/pre-execute** mode (which doesn't write to the ledger or cost gas) to query metadata and token balances.

#### Query Contract Name:
```bash
./dnaNode contract invoke \
  --wallet Wallets/user1.dat --address "$CONTRACT_ADDR" \
  --vmtype 1 --params string:name,[] \
  --prepare --return string --rpcport 20336
```
> Expected Output: `MyToken`

#### Query User 1 Token Balance:
To query the balance, we pass the user's address converted to a bytearray or raw hex format.
```bash
./dnaNode contract invoke \
  --wallet Wallets/user1.dat --address "$CONTRACT_ADDR" \
  --vmtype 1 --params string:balanceOf,[string:AXXTe7hLX2TYxC6uEgET8G1emFEKEhFvPg] \
  --prepare --return int --rpcport 20336
```
> Expected Output: `1000000000`

---

### Step 8: OEP-4 Token Transfers
Now **User1** transfers `5,000,000` `MYT` tokens directly to **User2** by invoking the `transfer` method:
`transfer(from_addr, to_addr, amount)`

```bash
./dnaNode contract invoke \
  --wallet Wallets/user1.dat --account "$USER1" \
  --address "$CONTRACT_ADDR" \
  --vmtype 1 \
  --params string:transfer,[string:AXXTe7hLX2TYxC6uEgET8G1emFEKEhFvPg,string:APYAXgfNh5Z5UVZub4dbDTQM9kMbfZqzKH,int:5000000] \
  --gasprice 0 --gaslimit 200000 --rpcport 20336
```

Verify **User2**'s new `MYT` token balance:
```bash
./dnaNode contract invoke \
  --wallet Wallets/user1.dat --address "$CONTRACT_ADDR" \
  --vmtype 1 --params string:balanceOf,[string:APYAXgfNh5Z5UVZub4dbDTQM9kMbfZqzKH] \
  --prepare --return int --rpcport 20336
```
> Expected Output: `5000000`

---

## 3. Real-Time Frontend Monitoring
While running this scenario, open the Next.js network dashboard (`http://localhost:3000`):
1. **Network Activity**: View the block height incrementing past its genesis status.
2. **Recent Transactions**: Track the multi-sig transfer, user P2P transfers, contract deployment, and invocations.
3. **Mempool**: Watch pending transactions enter and get processed instantly by the consensus validator nodes.
