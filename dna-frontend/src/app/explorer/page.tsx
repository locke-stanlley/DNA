"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { Tabs, SectionTitle, Badge } from "@/components/ui";
import { useSettings } from "@/lib/hooks/useSettings";
import { Search, Blocks, Hash, Terminal, ChevronLeft, ChevronRight } from "lucide-react";

function ExplorerContent() {
  const params = useSearchParams();
  const { settings } = useSettings();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("block");
  const [blockHeight, setBlockHeight] = useState(1);

  useEffect(() => {
    const block = params.get("block");
    const tx = params.get("tx");
    const q = params.get("q");
    if (tx) { setTab("tx"); setQuery(tx); }
    else if (block) { setTab("block"); setQuery(block); setBlockHeight(Number(block)); }
    else if (q) { setQuery(q); }
  }, [params]);

  const search = async (q?: string, mode?: string) => {
    const val = q ?? query;
    const m = mode ?? tab;
    setLoading(true); setResult("");
    try {
      if (m === "block") {
        const res = await fetch(`/api/blockchain/block?q=${encodeURIComponent(val)}&rpcPort=${settings.rpcPort}`);
        const data = await res.json();
        setResult(JSON.stringify(data.block || data, null, 2));
      } else if (m === "tx") {
        const res = await fetch(`/api/transactions?hash=${encodeURIComponent(val)}&rpcPort=${settings.rpcPort}`);
        const data = await res.json();
        setResult(JSON.stringify(data.tx || data, null, 2));
      } else {
        const res = await fetch("/api/rpc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method: val, params: [], rpcPort: settings.rpcPort }),
        });
        const data = await res.json();
        setResult(JSON.stringify(data.result ?? data, null, 2));
      }
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Query failed");
    }
    setLoading(false);
  };

  const browseBlock = (delta: number) => {
    const next = Math.max(1, blockHeight + delta);
    setBlockHeight(next);
    setQuery(String(next));
    search(String(next), "block");
  };

  const quickQueries = [
    { label: "Block Count", tab: "rpc" as const, q: "getblockcount" },
    { label: "Best Hash", tab: "rpc" as const, q: "getbestblockhash" },
    { label: "Connections", tab: "rpc" as const, q: "getconnectioncount" },
    { label: "Mempool", tab: "rpc" as const, q: "getmempooltxcount" },
    { label: "Gas Price", tab: "rpc" as const, q: "getgasprice" },
    { label: "Network ID", tab: "rpc" as const, q: "getnetworkid" },
    { label: "Block #1", tab: "block" as const, q: "1" },
  ];

  return (
    <div>
      <Header title="Explorer" subtitle="Browse blocks, transactions & RPC data" />

      <Tabs tabs={[
        { id: "block", label: "Blocks" },
        { id: "tx", label: "Transactions" },
        { id: "rpc", label: "RPC" },
      ]} active={tab} onChange={setTab} />

      <div className="mt-6 dna-card">
        <div className="flex flex-wrap gap-3">
          <input
            className="dna-input min-w-[200px] flex-1 font-mono text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "block" ? "Block height or hash" : tab === "tx" ? "Transaction hash" : "RPC method"}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <button onClick={() => search()} disabled={loading} className="dna-btn-primary">
            <Search className="h-4 w-4" /> Search
          </button>
          {tab === "block" && (
            <div className="flex gap-1">
              <button onClick={() => browseBlock(-1)} className="dna-btn-secondary px-3"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => browseBlock(1)} className="dna-btn-secondary px-3"><ChevronRight className="h-4 w-4" /></button>
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {quickQueries.map((q) => (
            <button key={q.label} type="button" onClick={() => { setTab(q.tab); setQuery(q.q); search(q.q, q.tab); }}
              className="rounded-xl border border-dna-border bg-dna-surface px-3 py-1.5 text-xs text-dna-muted transition hover:border-dna-accent/40 hover:text-dna-accent">
              {q.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1 space-y-3">
          {[
            { icon: Blocks, label: "Blocks", desc: "Query by height or hash" },
            { icon: Hash, label: "Transactions", desc: "Lookup by 64-char hash" },
            { icon: Terminal, label: "RPC", desc: "Direct JSON-RPC calls" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="dna-card-inner">
              <Icon className="mb-2 h-5 w-5 text-dna-accent" />
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs text-dna-muted">{desc}</p>
            </div>
          ))}
        </div>
        <div className="dna-card lg:col-span-3">
          <SectionTitle title="Result" action={loading ? <Badge variant="accent">Loading…</Badge> : null} />
          <pre className="max-h-[600px] overflow-auto rounded-2xl bg-black p-4 font-mono text-xs leading-relaxed text-dna-accent">
            {result || "Run a query to see results"}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function ExplorerPage() {
  return <Suspense fallback={<div className="text-dna-muted">Loading…</div>}><ExplorerContent /></Suspense>;
}
