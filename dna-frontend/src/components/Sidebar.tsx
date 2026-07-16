"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Server, Wallet, ArrowLeftRight, FileCode2,
  Users, BookOpen, Settings, Blocks, LogOut, Hexagon,
} from "lucide-react";
import { cn } from "@/lib/format";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/nodes", label: "Nodes", icon: Server },
  { href: "/wallets", label: "Wallets", icon: Wallet },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/contracts", label: "Contracts", icon: FileCode2 },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/explorer", label: "Explorer", icon: Blocks },
  { href: "/help", label: "Help", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[240px] flex-col border-r border-dna-border bg-dna-bg px-4 py-6">
      <Link href="/" className="mb-8 flex items-center gap-3 px-2">
        <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-dna-accent shadow-glow">
          <Hexagon className="h-6 w-6 text-black" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-sm font-bold tracking-wide text-white">DNA</p>
          <p className="text-[10px] uppercase tracking-widest text-dna-muted">Network</p>
        </div>
      </Link>

      <nav className="flex-1 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all",
                active
                  ? "bg-dna-surface text-white shadow-inner"
                  : "text-dna-muted hover:bg-dna-surface/60 hover:text-white"
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", active ? "text-dna-accent" : "")} />
              {label}
            </Link>
          );
        })}
      </nav>

      <button className="mt-4 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-dna-muted transition-all hover:bg-dna-surface/60 hover:text-dna-red">
        <LogOut className="h-5 w-5" />
        Log out
      </button>
    </aside>
  );
}
