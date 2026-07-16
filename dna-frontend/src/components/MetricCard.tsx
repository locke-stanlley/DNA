"use client";

import { cn } from "@/lib/format";
import { LucideIcon, TrendingDown, TrendingUp, ArrowUpRight } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface MetricCardProps {
  title: string;
  subtitle?: string;
  value: string;
  change?: string;
  positive?: boolean;
  icon?: LucideIcon;
  sparkData?: number[];
  onClick?: () => void;
}

export default function MetricCard({
  title, subtitle, value, change, positive = true, icon: Icon, sparkData, onClick,
}: MetricCardProps) {
  const chartData = (sparkData?.length ? sparkData : [4, 6, 5, 8, 7, 9, 8]).map((v, i) => ({ i, v }));

  return (
    <button
      type="button"
      onClick={onClick}
      className="dna-card group relative min-w-[220px] flex-1 text-left"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-dna-surface border border-dna-border group-hover:border-dna-accent/30">
              <Icon className="h-5 w-5 text-dna-accent" />
            </div>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-dna-muted">{title}</p>
            {subtitle && <p className="text-[10px] text-dna-muted/70">{subtitle}</p>}
          </div>
        </div>
        <ArrowUpRight className="h-4 w-4 text-dna-muted opacity-0 transition group-hover:opacity-100 group-hover:text-dna-accent" />
      </div>

      <p className="text-2xl font-bold tracking-tight">{value}</p>

      {change && (
        <div className={cn("mt-1 flex items-center gap-1 text-xs font-semibold", positive ? "dna-stat-up" : "dna-stat-down")}>
          {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {change}
        </div>
      )}

      <div className="mt-3 h-14 opacity-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`g-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00e676" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#00e676" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke="#00e676" strokeWidth={2} fill={`url(#g-${title})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </button>
  );
}
