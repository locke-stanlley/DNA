"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Alert, Tabs, SectionTitle } from "@/components/ui";
import { useSettings } from "@/lib/hooks/useSettings";
import { Save, Server, Wallet, Globe, FolderOpen } from "lucide-react";

export default function SettingsPage() {
  const { settings, save, loaded } = useSettings();
  const [form, setForm] = useState(settings);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState("connection");

  useEffect(() => { if (loaded) setForm(settings); }, [loaded, settings]);

  const set = (k: keyof typeof form, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    save(form);
    setMsg("Settings saved to browser localStorage.");
  };

  if (!loaded) return <div className="text-dna-muted">Loading settings…</div>;

  return (
    <div>
      <Header title="Settings" subtitle="Connection defaults, wallet paths & environment" />

      <Tabs tabs={[
        { id: "connection", label: "Connection" },
        { id: "wallet", label: "Wallet" },
        { id: "env", label: "Environment" },
      ]} active={tab} onChange={setTab} />

      {tab === "connection" && (
        <div className="mt-6 dna-card max-w-lg space-y-5">
          <SectionTitle title={<span className="flex items-center gap-2"><Globe className="h-5 w-5 text-dna-accent" /> Network Connection</span>} />
          {[
            { key: "rpcPort" as const, label: "Default RPC Port", icon: Server },
            { key: "restPort" as const, label: "Default REST Port", icon: Server },
            { key: "dnaRoot" as const, label: "DNA Root Directory", icon: FolderOpen },
          ].map(({ key, label, icon: Icon }) => (
            <div key={key}>
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-dna-muted">
                <Icon className="h-3.5 w-3.5" /> {label}
              </label>
              <input className="dna-input mt-1" value={form[key]} onChange={(e) => set(key, key === "dnaRoot" ? e.target.value : Number(e.target.value))} />
            </div>
          ))}
          <button onClick={handleSave} className="dna-btn-primary"><Save className="h-4 w-4" /> Save</button>
        </div>
      )}

      {tab === "wallet" && (
        <div className="mt-6 dna-card max-w-lg space-y-5">
          <SectionTitle title={<span className="flex items-center gap-2"><Wallet className="h-5 w-5 text-dna-accent" /> Wallet Defaults</span>} />
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-dna-muted">Wallet Path</label>
            <input className="dna-input mt-1 font-mono text-xs" value={form.walletPath} onChange={(e) => set("walletPath", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-dna-muted">Wallet Password</label>
            <input className="dna-input mt-1" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} />
          </div>
          <button onClick={handleSave} className="dna-btn-primary w-full"><Save className="h-4 w-4" /> Save Settings</button>
        </div>
      )}

      {tab === "env" && (
        <div className="mt-6 dna-card">
          <SectionTitle title="Environment Variables" />
          <pre className="overflow-auto rounded-2xl bg-black p-4 text-xs leading-relaxed text-dna-accent">{`DNA_ROOT=/workspaces/DNA
DNA_NODE_BIN=/workspaces/DNA/dnaNode
DNA_WALLET=/workspaces/DNA/node1/wallet.dat
DNA_WALLET_PASSWORD=123456
DNA_RPC_PORT=20336
DNA_REST_PORT=20334`}</pre>
        </div>
      )}

      {msg && <div className="mt-4"><Alert type="info" message={msg} /></div>}

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Node 1 RPC", value: "20336" },
          { label: "Node 2 RPC", value: "20436" },
          { label: "Node 3 RPC", value: "20536" },
          { label: "Node 4 RPC", value: "20636" },
        ].map((p) => (
          <div key={p.label} className="dna-card-inner text-center">
            <p className="text-xs text-dna-muted">{p.label}</p>
            <p className="text-lg font-bold text-dna-accent">:{p.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
