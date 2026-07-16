import { spawn } from "child_process";
import { DNA_NODE_BIN, DNA_ROOT } from "./config";

export interface CliResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

export async function runDnaCli(
  args: string[],
  options?: { cwd?: string; stdin?: string; timeout?: number }
): Promise<CliResult> {
  return new Promise((resolve) => {
    const proc = spawn(DNA_NODE_BIN, args, {
      cwd: options?.cwd || DNA_ROOT,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        proc.kill();
        resolve({ ok: false, stdout, stderr: stderr || "timeout" });
      }
    }, options?.timeout || 30000);

    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    proc.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: code === 0, stdout: stdout.trim(), stderr: stderr.trim() });
    });

    proc.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: false, stdout: "", stderr: err.message });
    });

    if (options?.stdin) {
      proc.stdin.write(options.stdin);
    }
    proc.stdin.end();
  });
}

export function extractInt(text: string): number {
  const m = text.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

export function extractTxHash(text: string): string | null {
  const m = text.match(/TxHash:([a-f0-9]{64})/i);
  return m ? m[1] : null;
}

export function extractContractAddress(text: string): string | null {
  const m = text.match(/Contract Address:([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}

export interface ParsedAccount {
  index: string;
  label?: string;
  address: string;
  publicKey?: string;
  scheme?: string;
}

export function parseAccountList(stdout: string): ParsedAccount[] {
  const accounts: ParsedAccount[] = [];
  let cur: Partial<ParsedAccount> = {};
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("Index:")) {
      if (cur.address) accounts.push(cur as ParsedAccount);
      cur = { index: trimmed.split(":")[1]?.trim() || "" };
    } else if (trimmed.includes(":")) {
      const [k, ...rest] = trimmed.split(":");
      const v = rest.join(":").trim();
      const map: Record<string, keyof ParsedAccount> = {
        Label: "label",
        Address: "address",
        "Public key": "publicKey",
        "Signature scheme": "scheme",
      };
      const key = map[k.trim()];
      if (key) (cur as Record<string, string>)[key] = v;
    }
  }
  if (cur.address) accounts.push(cur as ParsedAccount);
  return accounts;
}

export function parseBalance(stdout: string): { ont: string; gas: string } {
  let ont = "0";
  let gas = "0";
  for (const line of stdout.split("\n")) {
    const t = line.trim();
    if (t.startsWith("ONT:")) ont = t.replace("ONT:", "").trim();
    if (t.startsWith("GAS:")) gas = t.replace("GAS:", "").trim();
  }
  return { ont, gas };
}
