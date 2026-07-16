"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface BlockChartProps {
  data: { height: number; label: string }[];
}

export default function BlockChart({ data }: BlockChartProps) {
  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-dna-muted text-sm">
        Block height data will appear as the network runs
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
        <XAxis dataKey="label" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
        <Tooltip
          contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, fontSize: 12 }}
          labelStyle={{ color: "#f5c518" }}
        />
        <Line type="monotone" dataKey="height" stroke="#f5c518" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#f5c518" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
