# DNA Cloud Network Testing Playbook

Because the `dnaNode` CLI tool hardcodes `localhost` as the target for all RPC queries (like checking balances or sending transactions), you normally can't point it directly at a public `https://` URL like Render.

However, we can bypass this limitation effortlessly by running a tiny **Local RPC Proxy**. This proxy listens on your computer's local port `20336` and securely tunnels all CLI commands to your live Render network!

---

## 1. Start the Local RPC Tunnel
Run this in a new terminal window and leave it running. It will forward all your local `dnaNode` commands to your cloud network.

```bash
# Save the proxy script
cat << 'EOF' > local_proxy.py
import http.server, urllib.request, json
import ssl

CLOUD_URL = "https://dna-network.onrender.com/"
LOCAL_PORT = 20336

class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        try:
            req = urllib.request.Request(CLOUD_URL, data=body, headers={"Content-Type": "application/json"})
            # Make the request to Render
            with urllib.request.urlopen(req, timeout=10) as r:
                resp = r.read()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(resp)
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(e).encode())

    def log_message(self, format, *args):
        pass # Hide spammy logs

print(f"🚀 Local RPC Tunnel Active!")
print(f"Forwarding localhost:{LOCAL_PORT} ===> {CLOUD_URL}")
http.server.HTTPServer(("127.0.0.1", LOCAL_PORT), ProxyHandler).serve_forever()
EOF

# Start the proxy
python3 local_proxy.py
```

---

## 2. Test Core Network Features
With the tunnel running, open a **second terminal** in your `/workspaces/DNA` folder. You can now use the exact same CLI commands as if the network was running on your laptop!

### A. Check Block Height
```bash
./dnaNode info curblockheight --rpcport 20336
```
*(You should see the block height matching your cloud network)*

### B. Check User1's Balance
Make sure you load your user variables in this terminal first! Run this snippet to populate `$USER1`, `$USER2`, etc.:
```bash
for i in {1..10}; do
  addr=$(./dnaNode account list --wallet Wallets/user${i}.dat | grep -o 'Address:[^ ]*' | cut -d: -f2)
  export USER${i}="$addr"
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
done
```

Then check the balance:
```bash
./dnaNode asset balance $USER1 --rpcport 20336
```

### C. Execute a Cloud Transfer
Let's send `50` GAS from User1 to User2 across the live Render network!
```bash
# 1. Build the transaction
./dnaNode buildtx transfer \
  --wallet Wallets/user1.dat --from "$USER1" --to "$USER2" \
  --amount 50 --asset gas 2>/dev/null | tail -1 > cloud_tx.raw

# 2. Sign and Broadcast it
./dnaNode sigtx \
  --wallet Wallets/user1.dat --wallet-password "123456" \
  --send "$(cat cloud_tx.raw)" --rpcport 20336
```

Wait a few seconds for a new block to be minted, then check User2's balance:
```bash
./dnaNode asset balance $USER2 --rpcport 20336
```

---

## 3. Deploy Smart Contracts to the Cloud

You can push your `MyToken` contract directly to Render!

```bash
# Deploy the contract
./dnaNode contract deploy \
  --wallet Wallets/user1.dat --account "$USER1" \
  --vmtype 1 \
  --code wasmtest/contracts-cplus/test_oep4.hex \
  --name "MyCloudToken" --version "1.0" \
  --author "$USER1" --desc "Cloud OEP4 Token" \
  --gasprice 0 --gaslimit 20000000 --rpcport 20336
```
*Note down the Contract Address output by this command.*

### Initialize the Contract
```bash
export CONTRACT_ADDR="<YOUR_CONTRACT_ADDRESS>"

./dnaNode contract invoke \
  --wallet Wallets/user1.dat --account "$USER1" \
  --address "$CONTRACT_ADDR" \
  --vmtype 1 \
  --params string:init,[string:foo] \
  --gasprice 0 --gaslimit 200000 --rpcport 20336
```

### Query Smart Contract Data (Free Prepare Mode)
```bash
# Query Contract Name
./dnaNode contract invoke \
  --wallet Wallets/user1.dat --address "$CONTRACT_ADDR" \
  --vmtype 1 --params string:name,[string:foo] \
  --prepare --return string --rpcport 20336

# Query User1 Token Balance (Requires USER1_HEX)
./dnaNode contract invoke \
  --wallet Wallets/user1.dat --address "$CONTRACT_ADDR" \
  --vmtype 1 --params "string:balanceOf,[bytearray:$USER1_HEX]" \
  --prepare --return int --rpcport 20336
```

---
**Why this is amazing:** Your private keys (in `wallet.dat`) never leave your local machine! You build and cryptographically sign transactions entirely locally, and only the mathematically secure, signed `hex` payload is tunneled to the Render cloud nodes for execution.
