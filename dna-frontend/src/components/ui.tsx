"use client";

import { cn } from "@/lib/format";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "error" | "warning" | "neutral" | "accent";
}

export function Badge({ children, variant = "neutral" }: BadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
      variant === "success" && "bg-dna-accent/15 text-dna-accent",
      variant === "error" && "bg-dna-red/15 text-dna-red",
      variant === "warning" && "bg-dna-orange/15 text-dna-orange",
      variant === "accent" && "bg-dna-accent text-black",
      variant === "neutral" && "border border-dna-border bg-dna-surface text-dna-muted"
    )}>
      {children}
    </span>
  );
}

export function Alert({ type = "info", message }: { type?: "success" | "error" | "info"; message: string }) {
  if (!message) return null;
  return (
    <div className={cn(
      "rounded-2xl border px-4 py-3 text-sm",
      type === "success" && "border-dna-accent/30 bg-dna-accent/5 text-dna-accent",
      type === "error" && "border-dna-red/30 bg-dna-red/5 text-dna-red",
      type === "info" && "border-dna-border bg-dna-surface text-dna-muted"
    )}>
      {message}
    </div>
  );
}

export function SectionTitle({ title, action }: { title: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold">{title}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <Icon className="mb-4 h-12 w-12 text-dna-muted/40" />}
      <p className="font-semibold text-white">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-dna-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Tabs({ tabs, active, onChange }: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={active === t.id ? "dna-tab dna-tab-active" : "dna-tab dna-tab-inactive"}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
