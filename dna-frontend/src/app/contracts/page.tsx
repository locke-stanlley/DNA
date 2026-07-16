"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Alert, Badge, Tabs, SectionTitle } from "@/components/ui";
import { useSettings } from "@/lib/hooks/useSettings";
import { shortAddr, timeAgo } from "@/lib/format";
import { Rocket, Zap, FileCode2, Play, Code2, TestTube } from "lucide-react";

interface Contract {
  id: number;
  name: string;
  address: string;
  codePath?: string;
  vmType?: number;
  createdAt: string;
}

export default function ContractsPage() {
  const { settings } = useSettings();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error" | "info">("info");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("deploy");

  const [form, setForm] = useState({
    codePath: "/workspaces/DNA/wasmtest/contracts-rust/hello.wasm",
    name: "MyContract",
    version: "1.0",
    author: "dev",
    email: "dev@example.com",
    desc: "DNA smart contract",
    vmType: "3",
    gasLimit: "20000000",
    gasPrice: "0",
    contractAddress: "",
    params: "string:hello",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const load = async () => {
    const res = await fetch("/api/contracts");
    const data = await res.json();
    setContracts(data.contracts || []);
  };

  useEffect(() => { load(); }, []);

  const submit = async (action: string) => {
    setLoading(true); setMsg("");
    const res = await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action, ...form,
        walletPath: settings.walletPath, password: settings.password, rpcPort: String(settings.rpcPort),
      }),
    });
    const data = await res.json();
    setLoading(false);
    setMsgType(data.ok ? "success" : "error");
    setMsg(data.contractAddress ? `Deployed: ${data.contractAddress}` : data.txHash ? `TxHash: ${data.txHash}` : data.stdout || data.stderr || data.error || "Done");
    if (data.ok) load();
  };

  return (
    <div>
      <Header title="Contracts" subtitle="Deploy & invoke NeoVM / WasmVM smart contracts" />

      <Tabs tabs={[
        { id: "deploy", label: "Deploy" },
        { id: "invoke", label: "Invoke" },
        { id: "registry", label: "Registry" },
        { id: "guide", label: "Guide" },
      ]} active={tab} onChange={setTab} />

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {(tab === "deploy" || tab === "invoke") && (
          <div className="dna-card space-y-4">
            {tab === "deploy" ? (
              <>
                <div><label className="text-xs text-dna-muted">Code File Path</label><input className="dna-input mt-1 font-mono text-xs" value={form.codePath} onChange={(e) => set("codePath", e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-dna-muted">Name</label><input className="dna-input mt-1" value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
                  <div><label className="text-xs text-dna-muted">VM Type</label><select className="dna-input mt-1" value={form.vmType} onChange={(e) => set("vmType", e.target.value)}><option value="1">NeoVM (.avm)</option><option value="3">WasmVM (.wasm)</option></select></div>
                  <div><label className="text-xs text-dna-muted">Version</label><input className="dna-input mt-1" value={form.version} onChange={(e) => set("version", e.target.value)} /></div>
                  <div><label className="text-xs text-dna-muted">Author</label><input className="dna-input mt-1" value={form.author} onChange={(e) => set("author", e.target.value)} /></div>
                  <div className="col-span-2"><label className="text-xs text-dna-muted">Description</label><input className="dna-input mt-1" value={form.desc} onChange={(e) => set("desc", e.target.value)} /></div>
                  <div><label className="text-xs text-dna-muted">Gas Limit</label><input className="dna-input mt-1" value={form.gasLimit} onChange={(e) => set("gasLimit", e.target.value)} /></div>
                  <div><label className="text-xs text-dna-muted">Gas Price</label><input className="dna-input mt-1" value={form.gasPrice} onChange={(e) => set("gasPrice", e.target.value)} /></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => submit("deploy")} disabled={loading} className="dna-btn-primary flex-1"><Rocket className="h-4 w-4" /> Deploy</button>
                  <button onClick={() => submit("prepare-deploy")} disabled={loading} className="dna-btn-secondary flex-1"><TestTube className="h-4 w-4" /> Pre-execute</button>
                </div>
              </>
            ) : (
              <>
                <div><label className="text-xs text-dna-muted">Contract Address</label><input className="dna-input mt-1 font-mono text-xs" value={form.contractAddress} onChange={(e) => set("contractAddress", e.target.value)} /></div>
                <div><label className="text-xs text-dna-muted">Params (e.g. string:hello,int:42)</label><input className="dna-input mt-1 font-mono text-xs" value={form.params} onChange={(e) => set("params", e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-dna-muted">Gas Limit</label><input className="dna-input mt-1" value={form.gasLimit} onChange={(e) => set("gasLimit", e.target.value)} /></div>
                  <div><label className="text-xs text-dna-muted">Gas Price</label><input className="dna-input mt-1" value={form.gasPrice} onChange={(e) => set("gasPrice", e.target.value)} /></div>
                </div>
                <button onClick={() => submit("invoke")} disabled={loading} className="dna-btn-primary w-full"><Zap className="h-4 w-4" /> Invoke Contract</button>
              </>
            )}
            {msg && <Alert type={msgType} message={msg} />}
          </div>
        )}

        <div className="dna-card">
          <SectionTitle title={<span className="flex items-center gap-2"><FileCode2 className="h-5 w-5 text-dna-accent" /> {tab === "registry" ? "All Contracts" : "Deployed Contracts"}</span>} />
          {tab === "guide" ? (
            <div className="space-y-4 text-sm text-dna-muted">
              <p><strong className="text-white">NeoVM</strong> — Use <code className="text-dna-accent">--vmtype 1</code> with <code>.avm</code> bytecode files.</p>
              <p><strong className="text-white">WasmVM</strong> — Use <code className="text-dna-accent">--vmtype 3</code> with <code>.wasm</code> files.</p>
              <p><strong className="text-white">Params</strong> — Format: <code className="text-dna-accent">string:hello,int:0,bool:true</code></p>
              <p><strong className="text-white">Pre-execute</strong> — Simulate deployment to estimate gas before committing.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {contracts.slice().reverse().map((c) => (
                <div key={c.id} className="dna-card-inner group transition hover:border-dna-accent/30">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{c.name}</p>
                    <Badge variant="neutral">VM {c.vmType || 1}</Badge>
                  </div>
                  <p className="mt-1 break-all font-mono text-xs text-dna-accent">{c.address}</p>
                  <p className="mt-1 text-xs text-dna-muted">{timeAgo(c.createdAt)}</p>
                  <button type="button" onClick={() => { setTab("invoke"); set("contractAddress", c.address); }} className="mt-2 text-xs font-medium text-dna-accent hover:underline">
                    <Play className="mr-1 inline h-3 w-3" /> Invoke →
                  </button>
                </div>
              ))}
              {!contracts.length && <p className="py-8 text-center text-dna-muted">No contracts deployed yet</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
