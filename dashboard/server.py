#!/usr/bin/env python3
import json
import os
import re
import subprocess
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = "/workspaces/DNA"
DASHBOARD_DIR = Path(ROOT) / "dashboard"
HISTORY_PATH = DASHBOARD_DIR / "tx_history.json"
CONTRACTS_PATH = DASHBOARD_DIR / "contract_registry.json"
ADDRESS_BOOK_PATH = DASHBOARD_DIR / "address_book.json"

NODE_PORTS = {
    "node1": (20336, 20334),
    "node2": (20436, 20434),
    "node3": (20536, 20534),
    "node4": (20636, 20634),
}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # suppress default access log noise

    def do_OPTIONS(self):
        self._cors(200)

    def do_GET(self):
        path = urlparse(self.path).path
        routes = {
            "/api/health": self._health,
            "/api/blockchain/status": self._blockchain_status,
            "/api/transaction/history": self._transaction_history,
            "/api/contract/list": self._contract_list,
            "/api/address/book": self._address_book_list,
        }
        if path in routes:
            self._send_json(routes[path]())
            return
        if path.startswith("/api/block/"):
            self._send_json(self._block_info(unquote(path.split("/", 3)[3])))
            return
        if path.startswith("/api/tx/"):
            self._send_json(self._tx_info(unquote(path.split("/", 3)[3])))
            return
        if path.startswith("/api/status/"):
            self._send_json(self._tx_status(unquote(path.split("/", 3)[3])))
            return
        if path.startswith("/api/node/") and path.endswith("/log"):
            self._send_json(self._node_log(path.split("/")[3]))
            return
        self._serve_static(path)

    def do_POST(self):
        path = urlparse(self.path).path
        routes = {
            "/api/health": self._health,
            "/api/wallet/create": self._wallet_create,
            "/api/wallet/list": self._wallet_list,
            "/api/wallet/import": self._wallet_import,
            "/api/wallet/export": self._wallet_export,
            "/api/account/balance": self._account_balance,
            "/api/asset/transfer": self._asset_transfer,
            "/api/asset/approve": self._asset_approve,
            "/api/asset/transferfrom": self._asset_transferfrom,
            "/api/asset/allowance": self._asset_allowance,
            "/api/multisig/address": self._multisig_address,
            "/api/node/start": self._node_start,
            "/api/node/stop": self._node_stop,
            "/api/transaction/transfer": self._transfer,
            "/api/transaction/build": self._transaction_build,
            "/api/transaction/sign": self._transaction_sign,
            "/api/transaction/send": self._transaction_send,
            "/api/transaction/show": self._transaction_show,
            "/api/transaction/history": self._transaction_history,
            "/api/transaction/clear": self._transaction_clear,
            "/api/contract/deploy": self._contract_deploy,
            "/api/contract/invoke": self._contract_invoke,
            "/api/contract/list": self._contract_list,
            "/api/blockchain/import": self._blockchain_import,
            "/api/blockchain/export": self._blockchain_export,
            "/api/address/book": self._address_book_list,
            "/api/address/add": self._address_book_add,
            "/api/address/remove": self._address_book_remove,
        }
        if path in routes:
            self._send_json(routes[path]())
            return
        self._send_json({"error": "not found"}, status=404)

    # ------------------------------------------------------------------ static
    def _serve_static(self, path):
        if path in ("", "/"):
            path = "/index.html"
        file_path = (DASHBOARD_DIR / path.lstrip("/")).resolve()
        if not str(file_path).startswith(str(DASHBOARD_DIR.resolve())):
            self._send_json({"error": "forbidden"}, status=403)
            return
        if file_path.exists() and file_path.is_file():
            content = file_path.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", self._mime(file_path))
            self.send_header("Content-Length", str(len(content)))
            self._cors_headers()
            self.end_headers()
            self.wfile.write(content)
        else:
            self._send_json({"error": "not found"}, status=404)

    def _mime(self, p):
        return {"css": "text/css; charset=utf-8", "js": "application/javascript; charset=utf-8"}.get(p.suffix.lstrip("."), "text/html; charset=utf-8")

    # ------------------------------------------------------------------ helpers
    def _read_json(self):
        n = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(n).decode("utf-8") if n else "{}"
        try:
            return json.loads(body) if body.strip() else {}
        except Exception:
            return {}

    def _dw(self, d): return d.get("walletPath") or os.path.join(ROOT, "wallets", "local_wallet.dat")
    def _dp(self, d): return d.get("password") or "123456"
    def _dr(self, d): return d.get("rpcPort") or 20336

    def _run(self, cmd, cwd=ROOT, stdin=None):
        proc = subprocess.run(cmd, cwd=cwd, input=stdin, text=True, capture_output=True, timeout=30)
        return proc

    def _fmt(self, proc):
        return {"ok": proc.returncode == 0, "stdout": proc.stdout.strip(), "stderr": proc.stderr.strip()}

    def _now(self):
        return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    def _extract_int(self, text):
        m = re.search(r"(\d+)", text)
        return int(m.group(1)) if m else 0

    def _extract_contract_address(self, text):
        m = re.search(r"Address:\s*([A-Za-z0-9]+)", text)
        return m.group(1) if m else None

    def _ensure_storage(self):
        DASHBOARD_DIR.mkdir(parents=True, exist_ok=True)
        for p, default in [(HISTORY_PATH, "[]"), (CONTRACTS_PATH, "[]"), (ADDRESS_BOOK_PATH, "[]")]:
            if not p.exists():
                p.write_text(default)

    def _load_json_file(self, path):
        self._ensure_storage()
        try:
            return json.loads(path.read_text())
        except Exception:
            return []

    def _save_json_file(self, path, data):
        self._ensure_storage()
        path.write_text(json.dumps(data, indent=2))

    def _append_history(self, item):
        h = self._load_json_file(HISTORY_PATH)
        h.append({**item, "id": len(h) + 1, "createdAt": self._now()})
        self._save_json_file(HISTORY_PATH, h[-500:])  # keep last 500

    def _append_contract(self, item):
        c = self._load_json_file(CONTRACTS_PATH)
        c.append({**item, "id": len(c) + 1, "createdAt": self._now()})
        self._save_json_file(CONTRACTS_PATH, c)

    # ------------------------------------------------------------------ health
    def _health(self):
        nodes = []
        for name, (rpc, rest) in NODE_PORTS.items():
            try:
                proc = self._run(["./dnaNode", "info", "curblockheight", "--rpcport", str(rpc)], cwd=os.path.join(ROOT, name))
                height = self._extract_int(proc.stdout) if proc.returncode == 0 else 0
                online = proc.returncode == 0
            except Exception:
                height, online = 0, False
            nodes.append({"id": name, "label": name.replace("node", "Node "), "host": "127.0.0.1",
                          "rpcPort": rpc, "restPort": rest, "height": height, "online": online})
        return {
            "nodes": nodes,
            "latestBlock": max((n["height"] for n in nodes), default=0),
            "networkOnline": any(n["online"] for n in nodes),
            "walletReady": os.path.exists(os.path.join(ROOT, "wallets", "local_wallet.dat")),
            "history": self._load_json_file(HISTORY_PATH)[-10:],
            "contracts": self._load_json_file(CONTRACTS_PATH),
            "timestamp": self._now(),
        }

    # ------------------------------------------------------------------ blockchain
    def _blockchain_status(self):
        proc = self._run(["./dnaNode", "info", "curblockheight", "--rpcport", "20336"])
        return {**self._fmt(proc), "height": self._extract_int(proc.stdout) if proc.returncode == 0 else 0}

    def _block_info(self, query):
        proc = self._run(["./dnaNode", "info", "block", query, "--rpcport", "20336"])
        return self._fmt(proc)

    def _tx_info(self, tx_hash):
        proc = self._run(["./dnaNode", "info", "tx", tx_hash, "--rpcport", "20336"])
        return self._fmt(proc)

    def _tx_status(self, tx_hash):
        proc = self._run(["./dnaNode", "info", "status", tx_hash, "--rpcport", "20336"])
        return self._fmt(proc)

    def _blockchain_import(self):
        data = self._read_json()
        fp = data.get("filePath") or ""
        if not fp or not Path(fp).exists():
            return {"ok": False, "error": "Import file not found"}
        proc = self._run(["./dnaNode", "import", fp])
        return self._fmt(proc)

    def _blockchain_export(self):
        data = self._read_json()
        fp = data.get("filePath") or os.path.join(ROOT, "Blocks_export.dat")
        cmd = ["./dnaNode", "export", str(data.get("startHeight") or "0"), str(data.get("endHeight") or "0"), fp]
        proc = self._run(cmd)
        return {**self._fmt(proc), "filePath": fp}

    # ------------------------------------------------------------------ node
    def _node_log(self, name):
        log_path = Path(ROOT) / name / "node.log"
        if not log_path.exists():
            return {"ok": False, "error": "Log not found", "lines": []}
        try:
            lines = log_path.read_text(errors="replace").splitlines()
            return {"ok": True, "lines": lines[-300:], "total": len(lines)}
        except Exception as e:
            return {"ok": False, "error": str(e), "lines": []}

    def _node_start(self):
        subprocess.Popen(["./scripts/run_multi_node_test.sh"], cwd=ROOT,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return {"ok": True, "message": "Network launch script started"}

    def _node_stop(self):
        subprocess.run(["pkill", "-f", "dnaNode --config config.json"],
                       cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return {"ok": True, "message": "Nodes stopped"}

    # ------------------------------------------------------------------ wallet
    def _wallet_create(self):
        data = self._read_json()
        wp = self._dw(data)
        pw = self._dp(data)
        os.makedirs(os.path.dirname(wp), exist_ok=True)
        proc = self._run(["./dnaNode", "account", "add", "-d", "--wallet", wp], stdin=f"{pw}\n{pw}\n")
        return {**self._fmt(proc), "walletPath": wp}

    def _wallet_list(self):
        data = self._read_json()
        proc = self._run(["./dnaNode", "account", "list", "-v", "--wallet", self._dw(data)], stdin=f"{self._dp(data)}\n")
        accounts = []
        if proc.returncode == 0:
            cur = {}
            for line in proc.stdout.splitlines():
                line = line.strip()
                if not line:
                    continue
                if line.startswith("Index:"):
                    if cur:
                        accounts.append(cur)
                    cur = {"index": line.split(":", 1)[1].strip()}
                elif ":" in line:
                    k, v = line.split(":", 1)
                    key_map = {"Label": "label", "Address": "address", "Public key": "publicKey", "Signature scheme": "scheme"}
                    if k in key_map:
                        cur[key_map[k]] = v.strip()
            if cur and "address" in cur:
                accounts.append(cur)
        return {**self._fmt(proc), "accounts": accounts}

    def _wallet_import(self):
        data = self._read_json()
        src = data.get("sourcePath") or os.path.join(ROOT, "wallets", "source_wallet.dat")
        proc = self._run(["./dnaNode", "account", "import", "--wallet", self._dw(data), "--source", src],
                         stdin=f"{self._dp(data)}\n")
        return self._fmt(proc)

    def _wallet_export(self):
        data = self._read_json()
        dest = data.get("exportPath") or os.path.join(ROOT, "wallets", "exported_wallet.dat")
        proc = self._run(["./dnaNode", "account", "export", "--wallet", self._dw(data), dest],
                         stdin=f"{self._dp(data)}\n")
        return {**self._fmt(proc), "exportPath": dest}

    # ------------------------------------------------------------------ account / asset
    def _account_balance(self):
        data = self._read_json()
        addr = data.get("address") or ""
        proc = self._run(["./dnaNode", "asset", "balance", addr, "--wallet", self._dw(data),
                          "--rpcport", str(self._dr(data))], stdin=f"{self._dp(data)}\n")
        return self._fmt(proc)

    def _asset_transfer(self):
        data = self._read_json()
        cmd = ["./dnaNode", "asset", "transfer", "--wallet", self._dw(data),
               "--rpcport", str(self._dr(data)), "--asset", data.get("asset") or "gas",
               "--amount", str(data.get("amount") or "1"),
               "--gasprice", str(data.get("gasPrice") or "0"),
               "--gaslimit", str(data.get("gasLimit") or "20000")]
        if data.get("from"): cmd += ["--from", data["from"]]
        if data.get("to"):   cmd += ["--to",   data["to"]]
        proc = self._run(cmd, stdin=f"{self._dp(data)}\n")
        self._append_history({"type": "Asset transfer", "summary": f"{data.get('amount')} {data.get('asset','gas')} → {data.get('to')}"})
        return self._fmt(proc)

    def _asset_approve(self):
        data = self._read_json()
        cmd = ["./dnaNode", "asset", "approve", "--wallet", self._dw(data),
               "--rpcport", str(self._dr(data)), "--asset", data.get("asset") or "ont",
               "--amount", str(data.get("amount") or "1")]
        if data.get("from"): cmd += ["--from", data["from"]]
        if data.get("to"):   cmd += ["--to",   data["to"]]
        proc = self._run(cmd, stdin=f"{self._dp(data)}\n")
        self._append_history({"type": "Approve", "summary": f"Approve {data.get('amount')} {data.get('asset','ont')} for {data.get('to')}"})
        return self._fmt(proc)

    def _asset_transferfrom(self):
        data = self._read_json()
        cmd = ["./dnaNode", "asset", "transferfrom", "--wallet", self._dw(data),
               "--rpcport", str(self._dr(data)), "--asset", data.get("asset") or "ont",
               "--amount", str(data.get("amount") or "1")]
        for flag, key in [("--sender", "sender"), ("--from", "from"), ("--to", "to")]:
            if data.get(key): cmd += [flag, data[key]]
        proc = self._run(cmd, stdin=f"{self._dp(data)}\n")
        self._append_history({"type": "TransferFrom", "summary": f"{data.get('amount')} {data.get('asset','ont')} from {data.get('from')} → {data.get('to')}"})
        return self._fmt(proc)

    def _asset_allowance(self):
        data = self._read_json()
        cmd = ["./dnaNode", "asset", "allowance", "--wallet", self._dw(data),
               "--rpcport", str(self._dr(data)), "--asset", data.get("asset") or "ont"]
        if data.get("from"): cmd += ["--from", data["from"]]
        if data.get("to"):   cmd += ["--to",   data["to"]]
        proc = self._run(cmd, stdin=f"{self._dp(data)}\n")
        return self._fmt(proc)

    def _multisig_address(self):
        data = self._read_json()
        proc = self._run(["./dnaNode", "multisigaddr", "-m", str(data.get("m") or "1"),
                          "--pubkey", data.get("pubkeys") or ""])
        return self._fmt(proc)

    # ------------------------------------------------------------------ transactions
    def _transfer(self):
        data = self._read_json()
        cmd = ["./dnaNode", "buildtx", "transfer", "--wallet", self._dw(data),
               "--from", data.get("from") or "", "--to", data.get("to") or "",
               "--amount", str(data.get("amount") or "1"), "--asset", data.get("asset") or "gas",
               "--rpcport", str(self._dr(data))]
        proc = self._run(cmd, stdin=f"{self._dp(data)}\n")
        self._append_history({"type": "Transfer", "summary": f"{data.get('amount')} {data.get('asset','gas')} → {data.get('to')}"})
        return self._fmt(proc)

    def _transaction_build(self):
        data = self._read_json()
        tx_type = data.get("txType") or "transfer"
        cmd = ["./dnaNode", "buildtx", tx_type, "--wallet", self._dw(data),
               "--from", data.get("from") or "", "--to", data.get("to") or "",
               "--amount", str(data.get("amount") or "1"), "--asset", data.get("asset") or "gas",
               "--rpcport", str(self._dr(data))]
        proc = self._run(cmd, stdin=f"{self._dp(data)}\n")
        return self._fmt(proc)

    def _transaction_sign(self):
        data = self._read_json()
        raw = data.get("rawTx") or ""
        account = data.get("account") or ""
        cmd = ["./dnaNode", "sigtx", "--wallet", self._dw(data)]
        if account:
            cmd += ["--account", account]
        cmd += ["--rpcport", str(self._dr(data)), raw]
        proc = self._run(cmd, stdin=f"{self._dp(data)}\n")
        return self._fmt(proc)

    def _transaction_send(self):
        data = self._read_json()
        proc = self._run(["./dnaNode", "sendtx", data.get("rawTx") or "",
                          "--rpcport", str(self._dr(data))])
        self._append_history({"type": "Send raw tx", "summary": "Sent raw transaction"})
        return self._fmt(proc)

    def _transaction_show(self):
        data = self._read_json()
        proc = self._run(["./dnaNode", "showtx", data.get("rawTx") or ""])
        return self._fmt(proc)

    def _transaction_history(self):
        return {"history": self._load_json_file(HISTORY_PATH)}

    def _transaction_clear(self):
        self._save_json_file(HISTORY_PATH, [])
        return {"ok": True, "message": "History cleared"}

    # ------------------------------------------------------------------ contracts
    def _contract_deploy(self):
        data = self._read_json()
        code = data.get("codePath") or "/workspaces/DNA/wasmtest/contracts-rust/hello.wasm"
        name = data.get("name") or Path(code).stem
        cmd = ["./dnaNode", "contract", "deploy", "--wallet", self._dw(data),
               "--rpcport", str(self._dr(data)), "--code", code,
               "--vmtype", str(data.get("vmType") or "3"),
               "--name", name, "--version", str(data.get("version") or "1.0"),
               "--author", data.get("author") or "", "--email", data.get("email") or "",
               "--desc", data.get("desc") or ""]
        proc = self._run(cmd, stdin=f"{self._dp(data)}\n")
        addr = self._extract_contract_address(proc.stdout)
        self._append_contract({"name": name, "address": addr or "pending", "codePath": code})
        return {**self._fmt(proc), "contractAddress": addr}

    def _contract_invoke(self):
        data = self._read_json()
        addr = data.get("contractAddress") or ""
        cmd = ["./dnaNode", "contract", "invoke", "--wallet", self._dw(data),
               "--rpcport", str(self._dr(data)), "--address", addr,
               "--params", data.get("params") or "string:hello",
               "--version", str(data.get("version") or "0")]
        proc = self._run(cmd, stdin=f"{self._dp(data)}\n")
        self._append_history({"type": "Contract invoke", "summary": f"Invoked {addr or 'contract'}"})
        return self._fmt(proc)

    def _contract_list(self):
        return {"contracts": self._load_json_file(CONTRACTS_PATH)}

    # ------------------------------------------------------------------ address book
    def _address_book_list(self):
        return {"addresses": self._load_json_file(ADDRESS_BOOK_PATH)}

    def _address_book_add(self):
        data = self._read_json()
        addr = data.get("address") or ""
        label = data.get("label") or addr[:8]
        if not addr:
            return {"ok": False, "error": "address required"}
        book = self._load_json_file(ADDRESS_BOOK_PATH)
        if any(e["address"] == addr for e in book):
            return {"ok": False, "error": "address already in book"}
        book.append({"address": addr, "label": label, "addedAt": self._now()})
        self._save_json_file(ADDRESS_BOOK_PATH, book)
        return {"ok": True, "addresses": book}

    def _address_book_remove(self):
        data = self._read_json()
        addr = data.get("address") or ""
        book = [e for e in self._load_json_file(ADDRESS_BOOK_PATH) if e["address"] != addr]
        self._save_json_file(ADDRESS_BOOK_PATH, book)
        return {"ok": True, "addresses": book}

    # ------------------------------------------------------------------ response
    def _cors(self, status):
        self.send_response(status)
        self._cors_headers()
        self.end_headers()

    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "86400")

    def _send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self._cors_headers()
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    httpd = HTTPServer(("0.0.0.0", 8080), Handler)
    print("DNA dashboard running → http://0.0.0.0:8080")
    httpd.serve_forever()
