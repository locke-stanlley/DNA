"use client";

import { useEffect, useState } from "react";

export interface Settings {
  walletPath: string;
  password: string;
  rpcPort: number;
  restPort: number;
  dnaRoot: string;
}

const DEFAULTS: Settings = {
  walletPath: "/workspaces/DNA/node1/wallet.dat",
  password: "123456",
  rpcPort: 20336,
  restPort: 20334,
  dnaRoot: "/workspaces/DNA",
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("dna-settings");
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  const save = (next: Partial<Settings>) => {
    const merged = { ...settings, ...next };
    setSettings(merged);
    localStorage.setItem("dna-settings", JSON.stringify(merged));
  };

  return { settings, save, loaded };
}
