# Real-World Use Case Playbook: DNA Network Case Scenario

This guide outlines a comprehensive end-to-end simulation of a real-world mainnet use case on the DNA blockchain network. 

## Scenario Overview
We assume a 10-user network where participants manage their own local wallets, carry out peer-to-peer asset transfers, deploy a custom **OEP-4 Token Contract (`MyToken`)**, initialize the token supply, and execute smart contract-based token transfers.

---

## 1. Network Users Directory
Here are the 10 simulated users, including their wallet filenames, addresses, public keys, and default password (`123456`).

| User Label | Wallet File | Base58 Wallet Address | Public Key Hex |
| :--- | :--- | :--- | :--- |
| **User1 (Funder/Owner)** | `user1.dat` | `ALAR4FTotsZ49v2YiJrmQFAScnWo6pbvJ2` | `03cdbe30c51fca13ec47b60195ebb67e515deac322811d0bf6bdb2023370ef4038` |
| **User2** | `user2.dat` | `AY21bm8nmvF7gw524WguehsT3jucUg1Acb` | `033deda891d965d0d705fcdf619948419148d0eae5be56e37022e2d1d42a443c29` |
| **User3** | `user3.dat` | `AMuxFXYe3kpNoyzWACrcEbVcESDB1sm1Fp` | `023cbc9302d0e3b070b96225207d022c20a66d5aeed3c3d7b9b34bca709c164db3` |
| **User4** | `user4.dat` | `AGkMPFsA2detc5DVV9P24dHUwduRNGtXhA` | `0237c4601545ccd5004fb07efa1e3ae68f625909b5930adeba3d7d95818f164f7d` |
| **User5** | `user5.dat` | `ATmCao5zfgD9N5gkpUZiFkwQQKHsJExHSu` | `020c265364c9640347d8827a2d9f91f0fd3c170de4375c35aa0e3dcf976ce8d662` |
| **User6** | `user6.dat` | `AKCjCqMuD1KovuUubrqn3dYSXSzfPVuEYq` | `02610168a0ee36b607194d4791886bff9bebdd98b78abdf744470dc5750a940f71` |
| **User7** | `user7.dat` | `AMrjjwqHq7unCoGEsBdXx7ivCnJuceVmeh` | `039493f15c8a9521123c886184fdc3ac33951b693fc92775f838c4499977837082` |
| **User8** | `user8.dat` | `AVxUjAcpUXTfvL35rTXKownHan5D2A3rfg` | `02b414008f8dd1d7573e0e1bcf1886a436a81d67c3e6f6dc697f6b176ab5170f9d` |
| **User9** | `user9.dat` | `AaDAb3yR2MhtvLtdxvaaTkkWt6k7EtyZA8` | `02aa3bb70f070d9eccf4a69128441ee9c2add9805bc4d952530a6fe6c1c41be71c` |
| **User10** | `user10.dat` | `APGYdiVu1VMBVJKMj1Qexj5q8SP3ePmMBk` | `033b64c879330726247a9f4428408dafdbd73398c8f9452c7b8075dcd1e32c4096` |

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

> [!NOTE]
> If wallets already exist, you will see `[ERROR] error creating new account: duplicate label` — this is expected and safe to ignore. The existing wallets will be reused.

---

### Step 1.5: Dynamically Load User Addresses and Hex Hashes
After generating the 10 wallets, run this bash snippet to extract their addresses and derive the hex script hashes required by smart contract invocations:

```bash
# Dynamically extract and assign user addresses and hex hashes
for i in {1..10}; do
  addr=$(./dnaNode account list --wallet Wallets/user${i}.dat | grep -o 'Address:[^ ]*' | cut -d: -f2)
  export USER${i}="$addr"
  # Decode Base58 address to raw 20-byte hex script hash (used in contract calls)
  hex_hash=$(python3 -c "
ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
def base58_decode(encoded):
    n = 0
    for char in encoded:
        n = n * 58 + ALPHABET.index(char)
    return n.to_bytes(25, 'big')
print(base58_decode('$addr')[1:21].hex())
")
  export USER${i}_HEX="$hex_hash"
  echo "USER${i}=$addr (HEX=$hex_hash)"
done
```

> [!IMPORTANT]
> The `USER_HEX` variables are required for Steps 7 and 8. The `dnaNode` CLI contract invoker passes `string:` params as literal strings, not as address bytes — so `balanceOf` and `transfer` must receive `bytearray:$USERn_HEX` format to match the contract's internal `RuntimeBase58ToAddress` lookup.

---

### Step 2: Multi-Sig Funding (Validator to User1)
On network genesis, 100% of the GAS supply (`1,000,000,000` GAS) is allocated to the **4-of-5 Multi-Signature address** (`AWNwv764Dj1BM2KuvRXeVhbGSUqgokrwnJ`) composed of the 5 validator public keys (4 active nodes + 1 standby node5).

> [!NOTE]
> The genesis `NextBookkeeper` address is derived from all peers listed in the initial `config.json` used at first launch. Our setup has 5 peers total (nodes 1–5), producing a **4-of-5** threshold address. Even though node5 is not running as a consensus participant, its public key is included in the address derivation.

We will gather 4 signatures from nodes 1–4 (satisfying the 4-of-5 threshold) and broadcast the transfer.

```bash
# 1. Set environment variables (USER1 is already loaded in Step 1.5)
export MULTISIG="AWNwv764Dj1BM2KuvRXeVhbGSUqgokrwnJ"

# Comma-separated public keys of all 5 validators (sorted lexicographically):
export VAL_PUBS_5="02f86ca933f69c4109ea936dff7d8507e41618500dbd376dd72e011afa6ac577be,0314556d5690d073d4699d719108b583c72be2c30bda56bbfdd58e21f261cd8ec7,03603f114619cd06c1d04142d2c00a10e8fb3a668245b8105b5c095bf26cd8edde,03929c5ceef5e5211910e04ae309c1b623fcb9b118ebb482cf0d02c028d3ec3a57,03e4ca87bb7170539c76a6da64900c960f37946e436802b7ba7f69e170c333f3b4"

# 2. Build the unsigned transaction
./dnaNode buildtx transfer \
  --from "$MULTISIG" --to "$USER1" \
  --amount 1000000 --asset gas 2>/dev/null | tail -1 > tx.raw

# 3. Sign sequentially with 4 validators (meets 4-of-5 threshold)
./dnaNode multisigtx --wallet node1/wallet.dat -m 4 --pubkey "$VAL_PUBS_5" \
  --wallet-password "123456" --hex-only "$(cat tx.raw)" > tx.sig1

./dnaNode multisigtx --wallet node2/wallet.dat -m 4 --pubkey "$VAL_PUBS_5" \
  --wallet-password "123456" --hex-only "$(cat tx.sig1)" > tx.sig2

./dnaNode multisigtx --wallet node3/wallet.dat -m 4 --pubkey "$VAL_PUBS_5" \
  --wallet-password "123456" --hex-only "$(cat tx.sig2)" > tx.sig3

# Sign with Validator 4 (and broadcast)
./dnaNode multisigtx --wallet node4/wallet.dat -m 4 --pubkey "$VAL_PUBS_5" \
  --wallet-password "123456" --send "$(cat tx.sig3)"
```

Verify **User1** received the GAS:
```bash
./dnaNode asset balance "$USER1" --rpcport 20336
```
> Expected Output: `GAS:1000000`

---

### Step 3: Funder Distributes GAS to Users 2–10
Now that **User1** has `1,000,000` GAS, they can act as the network onboarding funder and send `10,000` GAS to each of the other users.

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
> BalanceOf:AY21bm8nmvF7gw524WguehsT3jucUg1Acb
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
The contract deployment command expects the contract code to be a **hex-encoded ASCII string**, not raw binary bytecode. The `.avm` file has already been patched so that the contract owner matches **User1**'s address. Re-generate the `.hex` file from the patched `.avm`:

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
> Deploy contract:
>   Contract Address:549cb33a6624197aaed607844718b3b4f8800ce5
>   TxHash:...
> ```

```bash
# Set your deployed contract address (this is deterministic from User1's key + bytecode)
export CONTRACT_ADDR="549cb33a6624197aaed607844718b3b4f8800ce5"
```

---

### Step 6: Initialize the Token Contract
To distribute the initial supply of `1,000,000,000` tokens (`MYT`) to the contract Owner (**User1**), we must invoke the contract's `init` method.

```bash
./dnaNode contract invoke \
  --wallet Wallets/user1.dat --account "$USER1" \
  --address "$CONTRACT_ADDR" \
  --vmtype 1 \
  --params string:init,[string:foo] \
  --gasprice 0 --gaslimit 200000 --rpcport 20336
```
> [!NOTE]
> We pass `[string:foo]` as a dummy argument because the `dnaNode` CLI parser has a known bug where empty list inputs `[]` are discarded, causing a NeoVM stack imbalance and `index out of bound` error. Passing a dummy argument satisfies the VM stack parameter requirement.

---

### Step 7: Query Smart Contract Metadata & Balances
We can invoke the contract in **prepare/pre-execute** mode (which doesn't write to the ledger or cost gas) to query metadata and token balances.

#### Query Contract Name:
```bash
./dnaNode contract invoke \
  --wallet Wallets/user1.dat --address "$CONTRACT_ADDR" \
  --vmtype 1 --params string:name,[string:foo] \
  --prepare --return string --rpcport 20336
```
> Expected Output: `MyToken`

#### Query User 1 Token Balance:
The `balanceOf` method takes a raw 20-byte address hash (not a Base58 string). Use the `$USER1_HEX` variable loaded in Step 1.5:
```bash
./dnaNode contract invoke \
  --wallet Wallets/user1.dat --address "$CONTRACT_ADDR" \
  --vmtype 1 --params "string:balanceOf,[bytearray:$USER1_HEX]" \
  --prepare --return int --rpcport 20336
```
> Expected Output: `1000000000`

---

### Step 8: OEP-4 Token Transfers
Now **User1** transfers `5,000,000` `MYT` tokens directly to **User2** by invoking the `transfer` method.

> [!IMPORTANT]
> The `transfer` and `balanceOf` methods require raw 20-byte address hashes (the `bytearray:$USERn_HEX` format), **not** Base58 strings. These were computed in Step 1.5.

```bash
./dnaNode contract invoke \
  --wallet Wallets/user1.dat --account "$USER1" \
  --address "$CONTRACT_ADDR" \
  --vmtype 1 \
  --params "string:transfer,[bytearray:$USER1_HEX,bytearray:$USER2_HEX,int:5000000]" \
  --gasprice 0 --gaslimit 200000 --rpcport 20336
```

Verify **User2**'s new `MYT` token balance:
```bash
./dnaNode contract invoke \
  --wallet Wallets/user1.dat --address "$CONTRACT_ADDR" \
  --vmtype 1 --params "string:balanceOf,[bytearray:$USER2_HEX]" \
  --prepare --return int --rpcport 20336
```
> Expected Output: `5000000`

---

## 3. Real-Time Frontend Monitoring
While running this scenario, open the Next.js network dashboard (`http://localhost:3000`):
1. **Network Activity**: View the block height incrementing past its genesis status.
2. **Recent Transactions**: Track the multi-sig transfer, user P2P transfers, contract deployment, and invocations.
3. **Mempool**: Watch pending transactions enter and get processed instantly by the consensus validator nodes.
