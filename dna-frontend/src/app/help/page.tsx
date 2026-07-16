"use client";

import Header from "@/components/Header";
import { Tabs } from "@/components/ui";
import { BookOpen, Terminal, ChevronRight, Server, Wallet, ArrowLeftRight, FileCode2, Blocks } from "lucide-react";
import { useState } from "react";

const sections = [
  {
    id: "nodes", title: "Node Management", icon: Server,
    commands: [
      { cmd: "./dnaNode info curblockheight --rpcport 20336", desc: "Current block height" },
      { cmd: "./dnaNode --config config.json --enable-consensus --password 123456", desc: "Start node with VBFT consensus" },
      { cmd: 'curl -X POST http://127.0.0.1:20336 -d \'{"jsonrpc":"2.0","method":"getconnectioncount","params":[],"id":1}\'', desc: "Peer count via JSON-RPC" },
      { cmd: "./dnaNode info block 1 --rpcport 20336", desc: "Get block by height" },
    ],
  },
  {
    id: "wallets", title: "Wallets & Accounts", icon: Wallet,
    commands: [
      { cmd: "./dnaNode account add -d --wallet node1/wallet.dat", desc: "Create account" },
      { cmd: "./dnaNode account list -v --wallet node1/wallet.dat", desc: "List with pubkeys" },
      { cmd: "./dnaNode asset balance <address> --rpcport 20336", desc: "ONT + GAS balance" },
      { cmd: "./dnaNode asset stake --pubkey <key> --from <addr> --amount 10000", desc: "Stake for validator" },
    ],
  },
  {
    id: "txs", title: "Transactions", icon: ArrowLeftRight,
    commands: [
      { cmd: "./dnaNode asset transfer --from <f> --to <t> --amount 1 --asset gas", desc: "Direct GAS transfer" },
      { cmd: "./dnaNode buildtx transfer --from <f> --to <t> --amount 1 --asset gas", desc: "Build raw transfer" },
      { cmd: "./dnaNode sigtx --wallet wallet.dat --account <addr> <raw-hex>", desc: "Sign transaction" },
      { cmd: "./dnaNode sendtx --rpcport 20336 <signed-hex>", desc: "Broadcast signed tx" },
      { cmd: "./dnaNode info status <tx-hash> --rpcport 20336", desc: "Query execution status" },
      { cmd: "./dnaNode asset approve --from <f> --to <t> --amount 10 --asset gas", desc: "Approve allowance" },
    ],
  },
  {
    id: "contracts", title: "Smart Contracts", icon: FileCode2,
    commands: [
      { cmd: "./dnaNode contract deploy --code contract.avm --vmtype 1 --name MyContract", desc: "Deploy NeoVM" },
      { cmd: "./dnaNode contract deploy --code contract.wasm --vmtype 3", desc: "Deploy WasmVM" },
      { cmd: './dnaNode contract invoke --address <addr> --params "string:hello"', desc: "Invoke method" },
      { cmd: "./dnaNode contract deploy --prepare --code contract.avm", desc: "Pre-execute deploy" },
    ],
  },
  {
    id: "explorer", title: "Blockchain Explorer", icon: Blocks,
    commands: [
      { cmd: "getblockcount / getbestblockhash / getblock", desc: "JSON-RPC block queries" },
      { cmd: "./dnaNode info tx <hash> --rpcport 20336", desc: "Transaction details" },
      { cmd: "./dnaNode showtx <raw-hex>", desc: "Decode raw transaction" },
    ],
  },
  {
    id: "api", title: "Dashboard API", icon: Terminal,
    commands: [
      { cmd: "GET /api/health", desc: "Network health & node status" },
      { cmd: "POST /api/wallets { action: 'list' | 'balance' | 'create' }", desc: "Wallet operations" },
      { cmd: "POST /api/transactions/actions { action: 'transfer' | 'approve' | 'sign' }", desc: "Transaction ops" },
      { cmd: "POST /api/contracts { action: 'deploy' | 'invoke' }", desc: "Contract ops" },
      { cmd: "POST /api/rpc { method, params, rpcPort }", desc: "JSON-RPC proxy" },
      { cmd: "GET/POST/DELETE /api/contacts", desc: "Address book CRUD" },
    ],
  },
];

export default function HelpPage() {
  const [tab, setTab] = useState("cli");
  const [open, setOpen] = useState<string | null>("nodes");

  return (
    <div>
      <Header title="Help" subtitle="CLI reference, API docs & network guides" />

      <Tabs tabs={[
        { id: "cli", label: "CLI Commands" },
        { id: "api", label: "API Reference" },
        { id: "setup", label: "Network Setup" },
      ]} active={tab} onChange={setTab} />

      <div className="mt-6">
        {tab === "cli" && (
          <div className="space-y-3">
            {sections.filter((s) => s.id !== "api").map((section) => (
              <div key={section.id} className="dna-card">
                <button type="button" onClick={() => setOpen(open === section.id ? null : section.id)} className="flex w-full items-center justify-between text-left">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <section.icon className="h-5 w-5 text-dna-accent" />
                    {section.title}
                  </h2>
                  <ChevronRight className={`h-5 w-5 text-dna-muted transition ${open === section.id ? "rotate-90" : ""}`} />
                </button>
                {open === section.id && (
                  <div className="mt-4 space-y-2">
                    {section.commands.map((c) => (
                      <div key={c.cmd} className="dna-card-inner">
                        <p className="mb-1 text-sm text-dna-muted">{c.desc}</p>
                        <code className="break-all text-xs text-dna-accent">{c.cmd}</code>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "api" && (
          <div className="space-y-3">
            {sections.find((s) => s.id === "api")?.commands.map((c) => (
              <div key={c.cmd} className="dna-card">
                <p className="text-sm text-dna-muted">{c.desc}</p>
                <code className="mt-2 block text-sm text-dna-accent">{c.cmd}</code>
              </div>
            ))}
          </div>
        )}

        {tab === "setup" && (
          <div className="dna-card">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><BookOpen className="h-5 w-5 text-dna-accent" /> Multi-Node VBFT Setup</h2>
            <pre className="overflow-auto rounded-2xl bg-black p-4 text-xs leading-relaxed text-dna-accent">{`# 1. Build
cd /workspaces/DNA && make

# 2. Create 4 node directories with wallets
mkdir -p node1 node2 node3 node4
./dnaNode account add -d --wallet node1/wallet.dat  # password: 123456

# 3. Configure config.json with peer pubkeys & SeedList

# 4. Start each node (--enable-consensus required!)
cd node1 && ./dnaNode --config config.json --data-dir Chain \\
  --wallet wallet.dat --nodeport 20338 --rpcport 20336 \\
  --password 123456 --enable-consensus

# 5. Verify all 4 nodes sync
./dnaNode info curblockheight --rpcport 20336  # repeat for 20436, 20536, 20636`}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
