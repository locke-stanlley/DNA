"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { Badge, Alert, Tabs, SectionTitle } from "@/components/ui";
import { useSettings } from "@/lib/hooks/useSettings";
import { shortAddr } from "@/lib/format";
import { Plus, RefreshCw, Copy, Wallet, Download, Upload, Lock, Coins } from "lucide-react";

interface Account { index: string; label?: string; address: string; publicKey?: string; scheme?: string; }

function WalletsContent() {
  const params = useSearchParams();
  const { settings, save } = useSettings();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<Record<string, { ont: string; gas: string }>>({});
  const [tab, setTab] = useState("accounts");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error" | "info">("info");
  const [loading, setLoading] = useState(false);
  const [stakeForm, setStakeForm] = useState({ pubkey: "", amount: "10000" });

  const api = async (action: string, extra = {}) => {
    setLoading(true);
    const res = await fetch("/api/wallets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, walletPath: settings.walletPath, password: settings.password, rpcPort: settings.rpcPort, ...extra }),
    });
    const data = await res.json();
    setLoading(false);
    return data;
  };

  const loadAccounts = async () => {
    const data = await api("list");
    if (data.accounts) {
      setAccounts(data.accounts);
      for (const acc of data.accounts) {
        const balRes = await fetch(`/api/wallets?address=${acc.address}&rpcPort=${settings.rpcPort}&wallet=${encodeURIComponent(settings.walletPath)}`);
        const balData = await balRes.json();
        if (balData.balance) setBalances((b) => ({ ...b, [acc.address]: balData.balance }));
      }
    }
    if (!data.ok && data.stderr) { setMsgType("error"); setMsg(data.stderr); }
  };

  useEffect(() => { loadAccounts(); }, [settings.walletPath]);

  useEffect(() => {
    const addr = params.get("address");
    if (addr) setTab("accounts");
  }, [params]);

  const copy = (t: string) => { navigator.clipboard.writeText(t); setMsg("Copied!"); setMsgType("success"); };

  return (
    <div>
      <Header title="Wallets" subtitle="Accounts, balances, staking & key management" />

      <Tabs tabs={[
        { id: "accounts", label: "Accounts" },
        { id: "create", label: "Create / Import" },
        { id: "stake", label: "Stake" },
        { id: "multisig", label: "Multisig" },
      ]} active={tab} onChange={setTab} />

      <div className="mt-6 mb-4 flex flex-wrap gap-3">
        <button onClick={loadAccounts} className="dna-btn-secondary"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>

      {msg && <div className="mb-4"><Alert type={msgType} message={msg} /></div>}

      {tab === "accounts" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {accounts.map((acc) => (
            <div key={acc.address} className="dna-card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-dna-accent/10">
                    <Wallet className="h-6 w-6 text-dna-accent" />
                  </div>
                  <div>
                    <p className="font-bold">{acc.label || `Account ${acc.index}`}</p>
                    <p className="font-mono text-xs text-dna-muted">{shortAddr(acc.address, 14, 8)}</p>
                  </div>
                </div>
                <button onClick={() => copy(acc.address)} className="text-dna-muted hover:text-dna-accent"><Copy className="h-4 w-4" /></button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="dna-card-inner">
                  <p className="text-xs text-dna-muted">ONT</p>
                  <p className="text-xl font-bold">{balances[acc.address]?.ont || "0"}</p>
                </div>
                <div className="dna-card-inner border-dna-accent/20">
                  <p className="text-xs text-dna-muted">GAS</p>
                  <p className="text-xl font-bold text-dna-accent">{balances[acc.address]?.gas || "—"}</p>
                </div>
              </div>
              <p className="mt-3 break-all font-mono text-[10px] text-dna-muted">{acc.address}</p>
              {acc.scheme && <Badge variant="neutral">{acc.scheme}</Badge>}
            </div>
          ))}
          {!accounts.length && (
            <div className="dna-card col-span-full py-12 text-center text-dna-muted">
              No accounts. Create one or check wallet path in Settings.
            </div>
          )}
        </div>
      )}

      {tab === "create" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="dna-card space-y-4">
            <SectionTitle title="Create Account" />
            <p className="text-sm text-dna-muted">Wallet: {settings.walletPath}</p>
            <button onClick={async () => { const d = await api("create"); setMsg(d.ok ? "Account created" : d.stderr); setMsgType(d.ok ? "success" : "error"); if (d.ok) loadAccounts(); }} disabled={loading} className="dna-btn-primary w-full">
              <Plus className="h-4 w-4" /> Create New Account
            </button>
          </div>
          <div className="dna-card space-y-4">
            <SectionTitle title="Import / Export" />
            <button onClick={async () => { const d = await api("import", { sourcePath: "/workspaces/DNA/wallets/exported_wallet.dat" }); setMsg(d.ok ? "Imported" : d.stderr); setMsgType(d.ok ? "success" : "error"); }} className="dna-btn-secondary w-full"><Upload className="h-4 w-4" /> Import Wallet</button>
            <button onClick={async () => { const d = await api("export", { exportPath: "/workspaces/DNA/wallets/exported_wallet.dat" }); setMsg(d.ok ? `Exported to ${d.exportPath}` : d.stderr); setMsgType(d.ok ? "success" : "error"); }} className="dna-btn-secondary w-full"><Download className="h-4 w-4" /> Export Wallet</button>
          </div>
        </div>
      )}

      {tab === "stake" && (
        <div className="dna-card max-w-lg space-y-4">
          <SectionTitle title={<span className="flex items-center gap-2"><Coins className="h-5 w-5 text-dna-accent" /> Validator Staking</span>} />
          <div>
            <label className="text-xs text-dna-muted">Validator Public Key</label>
            <input className="dna-input mt-1 font-mono text-xs" value={stakeForm.pubkey} onChange={(e) => setStakeForm({ ...stakeForm, pubkey: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-dna-muted">Stake Amount</label>
            <input className="dna-input mt-1" value={stakeForm.amount} onChange={(e) => setStakeForm({ ...stakeForm, amount: e.target.value })} />
          </div>
          <p className="text-xs text-dna-muted">Use CLI: <code className="text-dna-accent">./dnaNode asset stake --pubkey ... --from ... --amount ...</code></p>
        </div>
      )}

      {tab === "multisig" && (
        <div className="dna-card max-w-lg space-y-4">
          <SectionTitle title={<span className="flex items-center gap-2"><Lock className="h-5 w-5 text-dna-accent" /> Multisig Address</span>} />
          <p className="text-sm text-dna-muted">Generate a multisig address from multiple public keys using the CLI multisigaddr command.</p>
        </div>
      )}
    </div>
  );
}

export default function WalletsPage() {
  return <Suspense fallback={<div className="text-dna-muted">Loading…</div>}><WalletsContent /></Suspense>;
}
