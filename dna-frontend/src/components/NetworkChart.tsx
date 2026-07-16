"use client";

import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar,
} from "recharts";
import { Settings2 } from "lucide-react";

const TIMEFRAMES = ["1h", "3h", "1d", "1w", "1m"] as const;

interface ChartPoint {
  height: number;
  label: string;
  volume?: number;
}

interface NetworkChartProps {
  data: ChartPoint[];
  title?: string;
  currentHeight?: number;
}

export default function NetworkChart({ data, title = "Block Production", currentHeight }: NetworkChartProps) {
  const [tf, setTf] = useState<(typeof TIMEFRAMES)[number]>("1h");

  const chartData = data.length
    ? data.map((d, i) => ({ ...d, volume: d.volume ?? (i % 3) + 1 }))
    : [{ height: currentHeight || 0, label: "now", volume: 1 }];

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button type="button" className="text-dna-muted hover:text-dna-accent">
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-1">
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTf(t)}
              className={tf === t ? "dna-tab dna-tab-active" : "dna-tab dna-tab-inactive"}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {currentHeight !== undefined && (
        <div className="mb-4">
          <p className="text-xs text-dna-muted">Current Height</p>
          <p className="text-3xl font-bold text-white">{currentHeight.toLocaleString()}</p>
        </div>
      )}

      {!data.length ? (
        <div className="flex flex-1 items-center justify-center text-sm text-dna-muted">
          Collecting block data…
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252525" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#737373", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#737373", fontSize: 10 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ background: "#161616", border: "1px solid #252525", borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: "#00e676" }}
              />
              <Line type="monotone" dataKey="height" stroke="#00e676" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#00e676" }} />
            </LineChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height={48}>
            <BarChart data={chartData}>
              <Bar dataKey="volume" fill="#00e67633" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
