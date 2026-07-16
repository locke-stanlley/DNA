import { NextRequest } from "next/server";
import { runDnaCli, parseAccountList, parseBalance } from "@/lib/dna-cli";
import { fail, getPassword, getRpcPort, getWallet, ok, readBody } from "@/lib/api-utils";
import fs from "fs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const body = await readBody<Record<string, string>>(req);
  const action = body.action || "list";
  const wallet = getWallet(body);
  const password = getPassword(body);
  const rpcPort = getRpcPort(body);

  if (action === "create") {
    const dir = wallet.substring(0, wallet.lastIndexOf("/"));
    if (dir) fs.mkdirSync(dir, { recursive: true });
    const proc = await runDnaCli(["account", "add", "-d", "--wallet", wallet], { stdin: `${password}\n${password}\n` });
    return ok({ ...proc, walletPath: wallet });
  }

  if (action === "list") {
    const proc = await runDnaCli(["account", "list", "-v", "--wallet", wallet], { stdin: `${password}\n` });
    return ok({ ...proc, accounts: parseAccountList(proc.stdout) });
  }

  if (action === "import") {
    const source = body.sourcePath || "";
    if (!source) return fail("sourcePath required");
    const proc = await runDnaCli(["account", "import", "--wallet", wallet, "--source", source], { stdin: `${password}\n` });
    return ok(proc);
  }

  if (action === "export") {
    const dest = body.exportPath || "/workspaces/DNA/wallets/exported_wallet.dat";
    const proc = await runDnaCli(["account", "export", "--wallet", wallet, dest], { stdin: `${password}\n` });
    return ok({ ...proc, exportPath: dest });
  }

  if (action === "balance") {
    const addr = body.address || "";
    if (!addr) return fail("address required");
    const proc = await runDnaCli(["asset", "balance", addr, "--wallet", wallet, "--rpcport", String(rpcPort)], { stdin: `${password}\n` });
    return ok({ ...proc, balance: parseBalance(proc.stdout) });
  }

  if (action === "multisig") {
    const proc = await runDnaCli(["multisigaddr", "-m", body.m || "1", "--pubkey", body.pubkeys || ""]);
    return ok(proc);
  }

  return fail("Unknown action");
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address") || "";
  const rpcPort = Number(req.nextUrl.searchParams.get("rpcPort") || 20336);
  const wallet = req.nextUrl.searchParams.get("wallet") || "/workspaces/DNA/node1/wallet.dat";
  if (!address) return fail("address required");
  const proc = await runDnaCli(["asset", "balance", address, "--wallet", wallet, "--rpcport", String(rpcPort)]);
  return ok({ ...proc, balance: parseBalance(proc.stdout) });
}
