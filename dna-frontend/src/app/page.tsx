"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { Badge, Alert } from "@/components/ui";
import { useNetwork } from "@/lib/hooks/useNetwork";
import { useSettings } from "@/lib/hooks/useSettings";
import { formatGas, shortHash, timeAgo } from "@/lib/format";
import {
  Blocks, Server, ArrowLeftRight, Zap, Activity, Fuel,
  Users, TrendingUp, TrendingDown, RefreshCw, Send, Rocket,
} from "lucide-react";

const MetricCard = dynamic(() => import("@/components/MetricCard"), { ssr: false });
const NetworkChart = dynamic(() => import("@/components/NetworkChart"), { ssr: false });

export default function DashboardPage() {
  const router = useRouter();
  const { data, loading, error, refresh } = useNetwork(8000);
  const { settings } = useSettings();
  const [gasBalance, setGasBalance] = useState("—");
  const [chartData, setChartData] = useState<{ height: number; label: string }[]>([]);

  useEffect(() => {
    if (!data?.latestBlock) return;
    setChartData((prev) => {
      const label = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const last = prev[prev.length - 1];
      if (last?.height === data.latestBlock) return prev;
      return [...prev, { height: data.latestBlock, label }].slice(-30);
    });
  }, [data?.latestBlock]);

  useEffect(() => {
    (async () => {
      try {
        const w = await fetch("/api/wallets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "list", walletPath: settings.walletPath, password: settings.password }),
        }).then((r) => r.json());
        const addr = w.accounts?.[0]?.address;
        if (!addr) return;
        const b = await fetch(`/api/wallets?address=${addr}&rpcPort=${settings.rpcPort}&wallet=${encodeURIComponent(settings.walletPath)}`).then((r) => r.json());
        if (b.balance?.gas) setGasBalance(b.balance.gas);
      } catch { /* ignore */ }
    })();
  }, [settings]);

  const totalNodes = data?.totalCount ?? 5;
  const onlinePct = data ? Math.round((data.onlineCount / totalNodes) * 100) : 0;
  const blockDelta = useMemo(() => {
    const h = data?.blockHistory || [];
    if (h.length < 2) return 0;
    return h[h.length - 1] - h[Math.max(0, h.length - 10)];
  }, [data?.blockHistory]);

  const sparkFromHistory = (data?.blockHistory || []).slice(-8).map((h, i, arr) =>
    i === 0 ? 0 : h - arr[i - 1]
  );

  return (
    <div>
      <Header title="Dashboard" subtitle="DNA Network overview" />

      {error && (
        <div className="mb-4">
          <Alert type="error" message={`Network error: ${error}. Is dnaNode running?`} />
        </div>
      )}

      {/* Hero — Total Network Status (concept: TOTAL BALANCE banner) */}
      <div className="dna-card mb-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-dna-muted">Network Status</p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight md:text-5xl">
            {loading ? "…" : data?.networkOnline ? `#${data.latestBlock.toLocaleString()}` : "Offline"}
          </p>
          <p className="mt-2 text-sm text-dna-muted">
            {data?.onlineCount ?? 0}/{totalNodes} nodes online
            {data?.networkId ? ` · Network ID ${data.networkId}` : ""}
            {data?.version ? ` · ${data.version}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-6 lg:gap-10">
          {[
            { label: "Today", value: blockDelta > 0 ? `+${blockDelta} blocks` : `${blockDelta} blocks`, up: blockDelta >= 0 },
            { label: "7 Days", value: `${onlinePct}% uptime`, up: onlinePct >= 75 },
            { label: "30 Days", value: `${data?.contracts?.length ?? 0} contracts`, up: true },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-xs text-dna-muted">{s.label}</p>
              <p className={`mt-1 flex items-center justify-center gap-1 text-sm font-bold ${s.up ? "text-dna-accent" : "text-dna-red"}`}>
                {s.up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {s.value}
              </p>
            </div>
          ))}
          <button type="button" onClick={refresh} className="dna-btn-secondary self-center">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Metric cards row — concept asset cards */}
      <div className="mb-6 flex gap-4 overflow-x-auto pb-2">
        <MetricCard
          title="Block Height"
          subtitle="DNA Chain"
          value={data?.latestBlock?.toLocaleString() || "—"}
          change={`${data?.onlineCount ?? 0} nodes synced`}
          positive={(data?.onlineCount ?? 0) >= 3}
          icon={Blocks}
          sparkData={sparkFromHistory.length ? sparkFromHistory : undefined}
          onClick={() => router.push("/explorer")}
        />
        <MetricCard
          title="Online Nodes"
          subtitle="VBFT Network"
          value={`${data?.onlineCount ?? 0}/${totalNodes}`}
          change={data?.networkOnline ? "Consensus active" : "Down"}
          positive={data?.networkOnline}
          icon={Server}
          onClick={() => router.push("/nodes")}
        />
        <MetricCard
          title="Mempool"
          subtitle="Pending Txs"
          value={String(data?.mempoolCount ?? 0)}
          change="Live"
          positive
          icon={ArrowLeftRight}
          onClick={() => router.push("/transactions")}
        />
        <MetricCard
          title="Gas Price"
          subtitle="Network Fee"
          value={String(data?.gasPrice ?? 0)}
          change={`Wallet: ${gasBalance} GAS`}
          positive
          icon={Fuel}
          onClick={() => router.push("/wallets")}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* Green portfolio panel — concept "My Portfolio" */}
        <div className="xl:col-span-2">
          <div className="h-full rounded-3xl bg-dna-accent p-6 text-black shadow-glow">
            <h2 className="text-lg font-bold">Network Activity</h2>
            <p className="mb-4 text-xs opacity-70">Recent transactions & events</p>
            <div className="space-y-2">
              {(data?.history?.length ? [...data.history].reverse().slice(0, 8) : []).map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-2xl bg-black/10 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{h.type}</p>
                    <p className="truncate text-xs opacity-70">{h.summary}</p>
                  </div>
                  <div className="ml-3 shrink-0 text-right">
                    <Badge variant="accent">{timeAgo(h.createdAt)}</Badge>
                    {h.txHash && (
                      <Link href={`/transactions?hash=${h.txHash}`} className="mt-1 block font-mono text-[10px] underline opacity-80">
                        {shortHash(h.txHash, 10)}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
              {!data?.history?.length && (
                <p className="py-6 text-sm opacity-60">No activity yet. Send a transfer to get started.</p>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/transactions" className="rounded-xl bg-black/15 px-4 py-2 text-xs font-bold hover:bg-black/25">
                All transactions →
              </Link>
              <button type="button" onClick={() => router.push("/transactions")} className="rounded-xl bg-black px-4 py-2 text-xs font-bold text-dna-accent">
                <Send className="mr-1 inline h-3 w-3" /> Quick send
              </button>
            </div>
          </div>
        </div>

        {/* Main chart — concept chart section */}
        <div className="dna-card xl:col-span-3">
          <NetworkChart
            data={chartData}
            currentHeight={data?.latestBlock}
            title="Block Production"
          />
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {[
          { label: "Transfer GAS", icon: Send, href: "/transactions" },
          { label: "Deploy Contract", icon: Rocket, href: "/contracts" },
          { label: "Add Contact", icon: Users, href: "/contacts" },
          { label: "View Blocks", icon: Blocks, href: "/explorer" },
          { label: "Manage Nodes", icon: Server, href: "/nodes" },
          { label: "Wallet", icon: Zap, href: "/wallets" },
        ].map(({ label, icon: Icon, href }) => (
          <Link key={label} href={href} className="dna-card-inner flex flex-col items-center gap-2 py-4 text-center transition hover:border-dna-accent/40 hover:bg-dna-card-hover">
            <Icon className="h-5 w-5 text-dna-accent" />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        ))}
      </div>

      {/* Node grid */}
      <div className="mt-6 dna-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Activity className="h-5 w-5 text-dna-accent" />
            Node Status
          </h2>
          <Link href="/nodes" className="text-sm font-medium text-dna-accent hover:underline">Manage nodes →</Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(data?.nodes || []).map((node) => (
            <div key={node.id} className="dna-card-inner group cursor-pointer transition hover:border-dna-accent/30" onClick={() => router.push(`/nodes?node=${node.id}`)}>
              <div className="flex items-center justify-between">
                <p className="font-semibold">{node.label}</p>
                <Badge variant={node.online ? "success" : "error"}>{node.online ? "Online" : "Offline"}</Badge>
              </div>
              <p className="mt-2 text-3xl font-bold text-dna-accent">{node.height.toLocaleString()}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-dna-muted">
                <span>RPC :{node.rpc}</span>
                <span>P2P :{node.p2p}</span>
                <span>{node.connections} peers</span>
              </div>
            </div>
          ))}
          {!data?.nodes?.length && !loading && (
            <p className="col-span-full py-8 text-center text-dna-muted">No node data. Start the DNA network first.</p>
          )}
        </div>
      </div>
    </div>
  );
}
