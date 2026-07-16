import { NextRequest } from "next/server";
import { runDnaCli, extractTxHash } from "@/lib/dna-cli";
import { appendHistory, saveJson } from "@/lib/storage";
import { fail, getPassword, getRpcPort, getWallet, ok, readBody } from "@/lib/api-utils";
import { shortAddr } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const body = await readBody<Record<string, string>>(req);
  const action = body.action || "transfer";
  const wallet = getWallet(body);
  const password = getPassword(body);
  const rpcPort = getRpcPort(body);

  if (action === "show") {
    const proc = await runDnaCli(["showtx", body.rawTx || ""]);
    return ok(proc);
  }

  if (action === "send") {
    const proc = await runDnaCli(["sendtx", body.rawTx || "", "--rpcport", String(rpcPort)]);
    appendHistory({ type: "Send raw tx", summary: "Sent raw transaction" });
    return ok(proc);
  }

  if (action === "sign") {
    const cmd = ["sigtx", "--wallet", wallet, "--rpcport", String(rpcPort)];
    if (body.account) cmd.push("--account", body.account);
    cmd.push(body.rawTx || "");
    const proc = await runDnaCli(cmd, { stdin: `${password}\n` });
    return ok(proc);
  }

  if (action === "build") {
    const txType = body.txType || "transfer";
    const cmd = [
      "buildtx", txType, "--wallet", wallet,
      "--from", body.from || "", "--to", body.to || "",
      "--amount", body.amount || "1", "--asset", body.asset || "gas",
      "--rpcport", String(rpcPort),
    ];
    const proc = await runDnaCli(cmd, { stdin: `${password}\n` });
    return ok(proc);
  }

  if (action === "transfer" || action === "asset-transfer") {
    const cmd = [
      "asset", "transfer", "--wallet", wallet,
      "--rpcport", String(rpcPort), "--asset", body.asset || "gas",
      "--amount", body.amount || "1",
      "--gasprice", body.gasPrice || "0",
      "--gaslimit", body.gasLimit || "20000",
    ];
    if (body.from) cmd.push("--from", body.from);
    if (body.to) cmd.push("--to", body.to);
    const proc = await runDnaCli(cmd, { stdin: `${password}\n` });
    const txHash = extractTxHash(proc.stdout);
    appendHistory({
      type: "Asset transfer",
      summary: `${body.amount || "1"} ${(body.asset || "gas").toUpperCase()} ${shortAddr(body.from || "")} → ${shortAddr(body.to || "")}`,
      txHash: txHash || undefined,
    });
    return ok({ ...proc, txHash });
  }

  if (action === "approve") {
    const cmd = [
      "asset", "approve", "--wallet", wallet,
      "--rpcport", String(rpcPort), "--asset", body.asset || "gas",
      "--amount", body.amount || "1",
    ];
    if (body.from) cmd.push("--from", body.from);
    if (body.to) cmd.push("--to", body.to);
    const proc = await runDnaCli(cmd, { stdin: `${password}\n` });
    const txHash = extractTxHash(proc.stdout);
    appendHistory({ type: "Approve", summary: `Approve ${body.amount} ${body.asset || "gas"} for ${shortAddr(body.to || "")}`, txHash: txHash || undefined });
    return ok({ ...proc, txHash });
  }

  if (action === "transferfrom") {
    const cmd = [
      "asset", "transferfrom", "--wallet", wallet,
      "--rpcport", String(rpcPort), "--asset", body.asset || "gas",
      "--amount", body.amount || "1",
    ];
    if (body.sender) cmd.push("--sender", body.sender);
    if (body.from) cmd.push("--from", body.from);
    if (body.to) cmd.push("--to", body.to);
    const proc = await runDnaCli(cmd, { stdin: `${password}\n` });
    const txHash = extractTxHash(proc.stdout);
    appendHistory({ type: "TransferFrom", summary: `${body.amount} ${body.asset || "gas"} ${shortAddr(body.from || "")} → ${shortAddr(body.to || "")}`, txHash: txHash || undefined });
    return ok({ ...proc, txHash });
  }

  if (action === "allowance") {
    const cmd = [
      "asset", "allowance", "--wallet", wallet,
      "--rpcport", String(rpcPort), "--asset", body.asset || "gas",
    ];
    if (body.from) cmd.push("--from", body.from);
    if (body.to) cmd.push("--to", body.to);
    const proc = await runDnaCli(cmd, { stdin: `${password}\n` });
    return ok(proc);
  }

  return fail("Unknown action");
}

export async function GET() {
  const { getHistory } = await import("@/lib/storage");
  return ok({ history: getHistory() });
}

export async function DELETE() {
  saveJson("tx_history.json", []);
  return ok({ message: "History cleared" });
}
