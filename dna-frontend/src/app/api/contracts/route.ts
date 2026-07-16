import { NextRequest } from "next/server";
import { runDnaCli, extractContractAddress, extractTxHash } from "@/lib/dna-cli";
import { appendContract, appendHistory, getContracts } from "@/lib/storage";
import { fail, getPassword, getRpcPort, getWallet, ok, readBody } from "@/lib/api-utils";
import { shortAddr } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  return ok({ contracts: getContracts() });
}

export async function POST(req: NextRequest) {
  const body = await readBody<Record<string, string>>(req);
  const action = body.action || "deploy";
  const wallet = getWallet(body);
  const password = getPassword(body);
  const rpcPort = getRpcPort(body);

  if (action === "deploy") {
    const code = body.codePath || "";
    if (!code) return fail("codePath required");
    const name = body.name || "Contract";
    const cmd = [
      "contract", "deploy", "--wallet", wallet,
      "--rpcport", String(rpcPort), "--code", code,
      "--vmtype", body.vmType || "1",
      "--name", name,
      "--version", body.version || "1.0",
      "--author", body.author || "",
      "--email", body.email || "",
      "--desc", body.desc || "",
      "--gasprice", body.gasPrice || "0",
      "--gaslimit", body.gasLimit || "20000000",
    ];
    const proc = await runDnaCli(cmd, { stdin: `${password}\n` });
    const addr = extractContractAddress(proc.stdout);
    appendContract({ name, address: addr || "pending", codePath: code, vmType: Number(body.vmType || 1) });
    appendHistory({ type: "Contract deploy", summary: `Deployed ${name}`, txHash: extractTxHash(proc.stdout) || undefined });
    return ok({ ...proc, contractAddress: addr });
  }

  if (action === "invoke") {
    const addr = body.contractAddress || "";
    if (!addr) return fail("contractAddress required");
    const cmd = [
      "contract", "invoke", "--wallet", wallet,
      "--rpcport", String(rpcPort), "--address", addr,
      "--params", body.params || "string:hello",
      "--version", body.version || "0",
      "--gasprice", body.gasPrice || "0",
      "--gaslimit", body.gasLimit || "20000",
    ];
    const proc = await runDnaCli(cmd, { stdin: `${password}\n` });
    const txHash = extractTxHash(proc.stdout);
    appendHistory({ type: "Contract invoke", summary: `Invoked ${shortAddr(addr)}`, txHash: txHash || undefined });
    return ok({ ...proc, txHash });
  }

  if (action === "prepare-deploy") {
    const code = body.codePath || "";
    const cmd = [
      "contract", "deploy", "--wallet", wallet,
      "--rpcport", String(rpcPort), "--code", code,
      "--prepare", "--name", body.name || "Contract",
    ];
    const proc = await runDnaCli(cmd, { stdin: `${password}\n` });
    return ok(proc);
  }

  return fail("Unknown action");
}
