"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { Alert, Badge, Tabs, SectionTitle } from "@/components/ui";
import { useSettings } from "@/lib/hooks/useSettings";
import { shortHash, timeAgo } from "@/lib/format";
import { Send, FileText, PenLine, Trash2, CheckCircle, ArrowRightLeft, Shield } from "lucide-react";

interface HistoryEntry { id: number; type: string; summary: string; txHash?: string; createdAt: string; }

function TransactionsContent() {
  const params = useSearchParams();
  const { settings } = useSettings();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [tab, setTab] = useState("transfer");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error" | "info">("info");
  const [loading, setLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState("");

  const [form, setForm] = useState({
    from: "", to: "", amount: "1", asset: "gas",
    rawTx: "", account: "", hash: params.get("hash") || "",
    sender: "", gasPrice: "0", gasLimit: "20000",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const loadHistory = async () => {
    const res = await fetch("/api/transactions/actions");
    const data = await res.json();
    setHistory(data.history || []);
  };

  useEffect(() => { loadHistory(); }, []);
  useEffect(() => { if (params.get("hash")) { setTab("lookup"); set("hash", params.get("hash") || ""); } }, [params]);

  const submit = async (action: string) => {
    setLoading(true); setMsg("");
    const res = await fetch("/api/transactions/actions", {
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
    setMsg(data.txHash ? `TxHash: ${data.txHash}` : data.stdout || data.stderr || data.error || "Done");
    if (data.ok) loadHistory();
  };

  const lookup = async () => {
    setLoading(true);
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hash: form.hash, rpcPort: settings.rpcPort }),
    });
    const data = await res.json();
    setLoading(false);
    setLookupResult(data.stdout || data.stderr || JSON.stringify(data, null, 2));
  };

  const FormFields = () => (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2"><label className="text-xs text-dna-muted">From</label><input className="dna-input mt-1 font-mono text-xs" value={form.from} onChange={(e) => set("from", e.target.value)} placeholder="ARDRC7826..." /></div>
      <div className="col-span-2"><label className="text-xs text-dna-muted">To</label><input className="dna-input mt-1 font-mono text-xs" value={form.to} onChange={(e) => set("to", e.target.value)} /></div>
      <div><label className="text-xs text-dna-muted">Amount</label><input className="dna-input mt-1" value={form.amount} onChange={(e) => set("amount", e.target.value)} /></div>
      <div><label className="text-xs text-dna-muted">Asset</label><select className="dna-input mt-1" value={form.asset} onChange={(e) => set("asset", e.target.value)}><option value="gas">GAS</option><option value="ont">ONT</option></select></div>
      <div><label className="text-xs text-dna-muted">Gas Price</label><input className="dna-input mt-1" value={form.gasPrice} onChange={(e) => set("gasPrice", e.target.value)} /></div>
      <div><label className="text-xs text-dna-muted">Gas Limit</label><input className="dna-input mt-1" value={form.gasLimit} onChange={(e) => set("gasLimit", e.target.value)} /></div>
    </div>
  );

  return (
    <div>
      <Header title="Transactions" subtitle="Transfer, approve, build, sign & broadcast" />

      <Tabs tabs={[
        { id: "transfer", label: "Transfer" },
        { id: "approve", label: "Approve" },
        { id: "transferfrom", label: "Transfer From" },
        { id: "pipeline", label: "Build / Sign / Send" },
        { id: "lookup", label: "Lookup" },
        { id: "history", label: "History" },
      ]} active={tab} onChange={setTab} />

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="dna-card space-y-4">
          {(tab === "transfer" || tab === "approve" || tab === "transferfrom") && (
            <>
              <FormFields />
              {tab === "transferfrom" && (
                <div><label className="text-xs text-dna-muted">Sender (allowance holder)</label><input className="dna-input mt-1 font-mono text-xs" value={form.sender} onChange={(e) => set("sender", e.target.value)} /></div>
              )}
              <button onClick={() => submit(tab === "transfer" ? "asset-transfer" : tab === "approve" ? "approve" : "transferfrom")} disabled={loading} className="dna-btn-primary w-full">
                <Send className="h-4 w-4" />
                {tab === "transfer" ? "Send Transfer" : tab === "approve" ? "Approve Allowance" : "Transfer From"}
              </button>
            </>
          )}

          {tab === "pipeline" && (
            <>
              <div><label className="text-xs text-dna-muted">Raw TX (hex)</label><textarea className="dna-input mt-1 h-24 resize-none font-mono text-xs" value={form.rawTx} onChange={(e) => set("rawTx", e.target.value)} /></div>
              <div><label className="text-xs text-dna-muted">Signer Account</label><input className="dna-input mt-1 font-mono text-xs" value={form.account} onChange={(e) => set("account", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => submit("build")} className="dna-btn-secondary"><FileText className="h-4 w-4" /> Build</button>
                <button onClick={() => submit("sign")} className="dna-btn-secondary"><PenLine className="h-4 w-4" /> Sign</button>
                <button onClick={() => submit("send")} className="dna-btn-primary"><Send className="h-4 w-4" /> Send</button>
                <button onClick={() => submit("show")} className="dna-btn-secondary">Show TX</button>
              </div>
            </>
          )}

          {tab === "lookup" && (
            <>
              <div><label className="text-xs text-dna-muted">Transaction Hash</label><input className="dna-input mt-1 font-mono" value={form.hash} onChange={(e) => set("hash", e.target.value)} /></div>
              <button onClick={lookup} disabled={loading} className="dna-btn-primary w-full"><CheckCircle className="h-4 w-4" /> Query Status</button>
              {lookupResult && <pre className="max-h-64 overflow-auto rounded-2xl bg-black p-4 text-xs text-dna-accent">{lookupResult}</pre>}
            </>
          )}

          {tab === "history" && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {history.slice().reverse().map((h) => (
                <div key={h.id} className="dna-card-inner">
                  <div className="flex justify-between"><Badge variant="accent">{h.type}</Badge><span className="text-xs text-dna-muted">{timeAgo(h.createdAt)}</span></div>
                  <p className="mt-1 text-sm">{h.summary}</p>
                  {h.txHash && <button type="button" onClick={() => { setTab("lookup"); set("hash", h.txHash!); }} className="font-mono text-xs text-dna-accent hover:underline">{shortHash(h.txHash, 20)}</button>}
                </div>
              ))}
            </div>
          )}

          {msg && tab !== "history" && <Alert type={msgType} message={msg} />}
        </div>

        <div className="dna-card">
          <SectionTitle title="Transaction Guide" action={
            <button onClick={async () => { await fetch("/api/transactions/actions", { method: "DELETE" }); loadHistory(); }} className="text-xs text-dna-muted hover:text-dna-red"><Trash2 className="inline h-3 w-3" /> Clear</button>
          } />
          <div className="space-y-4 text-sm text-dna-muted">
            <div className="flex gap-3"><ArrowRightLeft className="h-5 w-5 shrink-0 text-dna-accent" /><p><strong className="text-white">Transfer</strong> — Send GAS directly from your wallet to another address.</p></div>
            <div className="flex gap-3"><Shield className="h-5 w-5 shrink-0 text-dna-accent" /><p><strong className="text-white">Approve</strong> — Grant another address permission to spend your GAS.</p></div>
            <div className="flex gap-3"><FileText className="h-5 w-5 shrink-0 text-dna-accent" /><p><strong className="text-white">Pipeline</strong> — Build raw tx → Sign with wallet → Broadcast to network.</p></div>
          </div>
          <div className="mt-6 space-y-2">
            <p className="text-xs font-semibold uppercase text-dna-muted">Recent</p>
            {history.slice(-5).reverse().map((h) => (
              <div key={h.id} className="flex justify-between text-xs"><span>{h.type}</span><span className="text-dna-muted">{timeAgo(h.createdAt)}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  return <Suspense fallback={<div className="text-dna-muted">Loading…</div>}><TransactionsContent /></Suspense>;
}
