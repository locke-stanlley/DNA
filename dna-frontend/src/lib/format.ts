const GAS_PRECISION = 9;

export function formatGas(raw: string | number): string {
  const n = typeof raw === "string" ? BigInt(raw || "0") : BigInt(raw);
  const divisor = BigInt(10 ** GAS_PRECISION);
  const whole = n / divisor;
  const frac = n % divisor;
  if (frac === BigInt(0)) return whole.toString();
  const fracStr = frac.toString().padStart(GAS_PRECISION, "0").replace(/0+$/, "");
  return `${whole}.${fracStr}`;
}

export function shortAddr(addr: string, head = 8, tail = 4): string {
  if (!addr || addr.length <= head + tail + 1) return addr || "—";
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function shortHash(hash: string, len = 12): string {
  if (!hash) return "—";
  return hash.length > len ? `${hash.slice(0, len)}…` : hash;
}

export function txStateLabel(state: number): string {
  switch (state) {
    case 1: return "Success";
    case 0: return "Failed";
    default: return "Pending";
  }
}

export function txStateColor(state: number): string {
  switch (state) {
    case 1: return "text-dna-green";
    case 0: return "text-dna-red";
    default: return "text-dna-accent";
  }
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
