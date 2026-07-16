"use client";

import { useCallback, useEffect, useState } from "react";

export interface NodeInfo {
  id: string;
  label: string;
  host: string;
  rpc: number;
  rest: number;
  p2p: number;
  height: number;
  connections: number;
  online: boolean;
}

export interface NetworkHealth {
  nodes: NodeInfo[];
  latestBlock: number;
  networkOnline: boolean;
  onlineCount: number;
  totalCount: number;
  networkId: number;
  version: string;
  gasPrice: number;
  mempoolCount: number;
  history: Array<{ id: number; type: string; summary: string; txHash?: string; createdAt: string }>;
  contracts: Array<{ id: number; name: string; address: string }>;
  blockHistory: number[];
  timestamp: string;
}

export function useNetwork(pollMs = 8000) {
  const [data, setData] = useState<NetworkHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network unreachable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, pollMs);
    return () => clearInterval(t);
  }, [refresh, pollMs]);

  return { data, loading, error, refresh };
}
