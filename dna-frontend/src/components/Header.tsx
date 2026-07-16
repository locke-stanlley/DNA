"use client";

import { useRouter } from "next/navigation";
import { Bell, Mail, Search } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (/^[a-f0-9]{64}$/i.test(q)) {
      router.push(`/explorer?tx=${q}`);
    } else if (/^\d+$/.test(q)) {
      router.push(`/explorer?block=${q}`);
    } else if (q.startsWith("A") && q.length > 20) {
      router.push(`/wallets?address=${q}`);
    } else {
      router.push(`/explorer?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-[180px]">
        <h1 className="text-2xl font-bold text-dna-accent md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-dna-muted">{subtitle}</p>}
      </div>

      <form onSubmit={onSearch} className="mx-auto w-full max-w-md flex-1">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-dna-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search blocks, txs, addresses…"
            className="w-full rounded-full border border-dna-border bg-dna-surface py-3 pl-11 pr-4 text-sm text-white placeholder:text-dna-muted focus:border-dna-accent/50 focus:outline-none focus:ring-1 focus:ring-dna-accent/20"
          />
        </div>
      </form>

      <div className="flex items-center justify-end gap-2">
        <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-dna-border bg-dna-surface text-dna-muted transition hover:text-white">
          <Mail className="h-4 w-4" />
        </button>
        <button type="button" className="relative flex h-10 w-10 items-center justify-center rounded-full border border-dna-border bg-dna-surface text-dna-muted transition hover:text-white">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-dna-accent" />
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-dna-accent to-dna-accent-dim text-sm font-bold text-black">
          D
        </div>
      </div>
    </header>
  );
}
