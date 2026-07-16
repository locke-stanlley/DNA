"use client";

import { cn } from "@/lib/format";
import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  positive?: boolean;
  icon?: LucideIcon;
  sparkData?: number[];
  color?: string;
}

export default function StatCard({ title, value, change, positive, icon: Icon, sparkData, color = "#f5c518" }: StatCardProps) {
  const chartData = (sparkData || [10, 12, 11, 14, 13, 16, 15]).map((v, i) => ({ i, v }));

  return (
    <div className="dna-card flex flex-col gap-3 min-w-[200px] flex-1">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="w-8 h-8 rounded-xl bg-dna-surface flex items-center justify-center">
              <Icon className="w-4 h-4 text-dna-yellow" />
            </div>
          )}
          <div>
            <p className="text-xs text-dna-muted uppercase tracking-wide">{title}</p>
            <p className="text-xl font-bold mt-0.5">{value}</p>
          </div>
        </div>
        {change && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", positive ? "text-dna-green" : "text-dna-red")}>
            {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {change}
          </div>
        )}
      </div>
      <div className="h-12 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#grad-${title})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
