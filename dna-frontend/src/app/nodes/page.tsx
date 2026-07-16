"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { Badge, Alert, Tabs, SectionTitle } from "@/components/ui";
import { useNetwork } from "@/lib/hooks/useNetwork";
import { Play, Square, RefreshCw, Terminal, Network, FileText, Cpu, Globe } from "lucide-react";

type BootstrapPeer = {
  address: string;
  port: number;
  lastSeen: string;
  source: string;
};

type BootstrapStatus = {
  online?: boolean;
  url?: string;
  peerCount?: number;
  uptime?: string;
  peers?: BootstrapPeer[];
  processRunning?: boolean;
};

function NodesContent() {
  const params = useSearchParams();
  const { data, refresh } = useNetwork(10000);
  const totalNodes = data?.totalCount ?? data?.nodes?.length ?? 5;
  const [selectedNode, setSelectedNode] = useState(params.get("node") || "node1");
  const [logs, setLogs] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error" | "info">("info");
  const [tab, setTab] = useState("status");
  const [loading, setLoading] = useState(false);
  const [bootstrap, setBootstrap] = useState<BootstrapStatus | null>(null);

  const loadBootstrap = async () => {
    const res = await fetch("/api/bootstrap");
    const d = await res.json();
    setBootstrap(d);
  };

  const loadLogs = async (id: string) => {
    const res = await fetch(`/api/nodes?id=${id}`);
    const d = await res.json();
    setLogs(d.lines || []);
  };

  useEffect(() => { loadLogs(selectedNode); }, [selectedNode]);
  useEffect(() => { if (tab === "bootstrap") loadBootstrap(); }, [tab]);

  const action = async (act: string) => {
    setLoading(true);
    const res = await fetch("/api/nodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: act }),
    });
    const d = await res.json();
    setMsgType(d.ok !== false ? "success" : "error");
    setMsg(d.message || d.error || "Done");
    setLoading(false);
    if (act !== "stop") setTimeout(refresh, 3000);
  };

  const bootstrapAction = async (act: string) => {
    setLoading(true);
    const res = await fetch("/api/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: act }),
    });
    const d = await res.json();
    setMsgType(d.ok !== false ? "success" : "error");
    setMsg(d.message || d.error || "Done");
    setBootstrap(d);
    setLoading(false);
  };

  const node = data?.nodes.find((n) => n.id === selectedNode);

  return (
    <div>
      <Header title="Nodes" subtitle="VBFT consensus network management" />

      <div className="mb-6 flex flex-wrap gap-3">
        <button onClick={() => action("start")} disabled={loading} className="dna-btn-primary"><Play className="h-4 w-4" /> Start Network</button>
        <button onClick={() => action("stop")} disabled={loading} className="dna-btn-danger"><Square className="h-4 w-4" /> Stop Network</button>
        <button onClick={() => { refresh(); loadLogs(selectedNode); }} className="dna-btn-secondary"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>

      {msg && <div className="mb-4"><Alert type={msgType} message={msg} /></div>}

      <Tabs tabs={[
        { id: "status", label: "Status" },
        { id: "bootstrap", label: "Bootstrap" },
        { id: "logs", label: "Logs" },
        { id: "topology", label: "Topology" },
        { id: "config", label: "Config" },
      ]} active={tab} onChange={setTab} />

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {tab === "status" && (
          <>
            <div className="xl:col-span-2 space-y-3">
              <SectionTitle title="All Nodes" />
              {(data?.nodes || []).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setSelectedNode(n.id)}
                  className={`w-full rounded-2xl border p-5 text-left transition ${selectedNode === n.id ? "border-dna-accent bg-dna-accent/5" : "border-dna-border bg-dna-card hover:border-dna-accent/30"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Cpu className="h-5 w-5 text-dna-accent" />
                      <div>
                        <p className="font-semibold">{n.label}</p>
                        <p className="text-xs text-dna-muted">127.0.0.1 · P2P :{n.p2p}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={n.online ? "success" : "error"}>{n.online ? "Online" : "Offline"}</Badge>
                      <p className="mt-1 text-2xl font-bold text-dna-accent">{n.height.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-4 text-xs text-dna-muted">
                    <span>RPC :{n.rpc}</span>
                    <span>REST :{n.rest}</span>
                    <span>{n.connections} peers connected</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="dna-card">
              <SectionTitle title={node?.label || "Node Details"} />
              {node ? (
                <dl className="space-y-3 text-sm">
                  {[
                    ["Status", node.online ? "Online" : "Offline"],
                    ["Block Height", node.height.toLocaleString()],
                    ["Connections", String(node.connections)],
                    ["RPC Port", String(node.rpc)],
                    ["REST Port", String(node.rest)],
                    ["P2P Port", String(node.p2p)],
                    ["Network ID", String(data?.networkId ?? "—")],
                    ["Version", data?.version || "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-dna-border pb-2">
                      <dt className="text-dna-muted">{k}</dt>
                      <dd className="font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              ) : <p className="text-dna-muted">Select a node</p>}
            </div>
          </>
        )}

        {tab === "bootstrap" && (
          <div className="xl:col-span-3 space-y-4">
            <div className="dna-card">
              <SectionTitle title={<span className="flex items-center gap-2"><Globe className="h-5 w-5 text-dna-accent" /> HTTP Bootstrap Server</span>} />
              <p className="mb-4 text-sm text-dna-muted">
                Standalone peer-discovery server. Nodes register on startup via POST /register and fetch GET /peers
                alongside SeedList and DHT discovery.
              </p>
              <div className="mb-4 flex flex-wrap gap-3">
                <button onClick={() => bootstrapAction("start")} disabled={loading} className="dna-btn-primary"><Play className="h-4 w-4" /> Start Bootstrap</button>
                <button onClick={() => bootstrapAction("stop")} disabled={loading} className="dna-btn-danger"><Square className="h-4 w-4" /> Stop</button>
                <button onClick={loadBootstrap} className="dna-btn-secondary"><RefreshCw className="h-4 w-4" /> Refresh</button>
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Status", bootstrap?.online ? "Online" : "Offline"],
                  ["URL", bootstrap?.url || "http://127.0.0.1:8090"],
                  ["Registered Peers", String(bootstrap?.peerCount ?? 0)],
                  ["Uptime", bootstrap?.uptime || "—"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-dna-border p-3">
                    <dt className="text-xs text-dna-muted">{k}</dt>
                    <dd className="mt-1 font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="dna-card">
              <SectionTitle title="Registered Peers" />
              {(bootstrap?.peers || []).length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dna-border text-left text-dna-muted">
                        <th className="pb-2 pr-4">Address</th>
                        <th className="pb-2 pr-4">Port</th>
                        <th className="pb-2 pr-4">Source</th>
                        <th className="pb-2">Last Seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(bootstrap?.peers || []).map((p, i) => (
                        <tr key={i} className="border-b border-dna-border/50">
                          <td className="py-2 pr-4 font-mono">{p.address}</td>
                          <td className="py-2 pr-4">{p.port}</td>
                          <td className="py-2 pr-4"><Badge variant={p.source === "static" ? "neutral" : "success"}>{p.source}</Badge></td>
                          <td className="py-2 text-xs text-dna-muted">{p.lastSeen ? new Date(p.lastSeen).toLocaleString() : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-dna-muted">No peers registered. Start the bootstrap server, then start nodes with HttpBootstrapServer in config.</p>
              )}
            </div>
          </div>
        )}

        {tab === "logs" && (
          <div className="xl:col-span-3 dna-card">
            <SectionTitle title={<span className="flex items-center gap-2"><Terminal className="h-5 w-5 text-dna-accent" /> Logs — {selectedNode}</span>} />
            <div className="mb-3 flex gap-2">
              {(data?.nodes || []).map((n) => (
                <button key={n.id} type="button" onClick={() => { setSelectedNode(n.id); loadLogs(n.id); }}
                  className={selectedNode === n.id ? "dna-tab dna-tab-active" : "dna-tab dna-tab-inactive"}>{n.label}</button>
              ))}
            </div>
            <div className="max-h-[500px] overflow-y-auto rounded-2xl bg-black p-4 font-mono text-xs leading-relaxed text-dna-accent">
              {logs.length ? logs.map((l, i) => <div key={i} className="opacity-90 hover:opacity-100">{l}</div>) : (
                <p className="text-dna-muted">No logs at /workspaces/DNA/{selectedNode}/node.log</p>
              )}
            </div>
          </div>
        )}

        {tab === "topology" && (
          <div className="xl:col-span-3 dna-card">
            <SectionTitle title={<span className="flex items-center gap-2"><Network className="h-5 w-5 text-dna-accent" /> Network Topology</span>} />
            <div className="flex flex-wrap items-center justify-center gap-8 py-12">
              {(data?.nodes || []).map((n, i) => (
                <div key={n.id} className="flex flex-col items-center">
                  <div className={`flex h-20 w-20 items-center justify-center rounded-full border-2 ${n.online ? "border-dna-accent bg-dna-accent/10 shadow-glow" : "border-dna-border bg-dna-surface"}`}>
                    <span className="text-lg font-bold">{i + 1}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold">{n.label}</p>
                  <p className="text-xs text-dna-muted">{n.connections} peers</p>
                  {i < (data?.nodes.length || 0) - 1 && <div className="hidden md:block absolute" />}
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-dna-muted">
              {data?.onlineCount ?? 0}/{totalNodes} nodes online · Latest block #{data?.latestBlock ?? 0}
            </p>
          </div>
        )}

        {tab === "config" && (
          <div className="xl:col-span-3 dna-card">
            <SectionTitle title={<span className="flex items-center gap-2"><FileText className="h-5 w-5 text-dna-accent" /> Node Configuration</span>} />
            <pre className="overflow-auto rounded-2xl bg-black p-4 text-xs text-dna-accent">{`# Start each node (from node directory):
./dnaNode --config config.json --data-dir Chain --wallet wallet.dat \\
  --nodeport 20338 --rpcport 20336 --restport 20334 \\
  --password 123456 --enable-consensus

# Required flags for VBFT block production:
#   --password       unlock wallet for consensus signing
#   --enable-consensus  participate in block production

# HTTP bootstrap (standalone):
./dnaNode bootstrap server --listen 0.0.0.0:8090 \\
  --seeds 127.0.0.1:20338,127.0.0.1:20438,127.0.0.1:20538,127.0.0.1:20638

# In config.json P2PNode section (base URL, no /peers suffix):
#   "HttpBootstrapServer": "http://127.0.0.1:8090"

# Port map:
#   Node 1: P2P 20338, RPC 20336, REST 20334
#   Node 2: P2P 20438, RPC 20436, REST 20434
#   Node 3: P2P 20538, RPC 20536, REST 20534
#   Node 4: P2P 20638, RPC 20636, REST 20634`}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NodesPage() {
  return <Suspense fallback={<div className="text-dna-muted">Loading…</div>}><NodesContent /></Suspense>;
}
