import { NextRequest } from "next/server";
import { rpcCall } from "@/lib/dna-client";
import { runDnaCli } from "@/lib/dna-cli";
import { fail, getRpcPort, ok } from "@/lib/api-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const hash = req.nextUrl.searchParams.get("hash") || "";
  const rpcPort = Number(req.nextUrl.searchParams.get("rpcPort") || 20336);
  if (!hash) return fail("hash required");

  try {
    const tx = await rpcCall("getrawtransaction", [hash, 1], rpcPort);
    return ok({ tx });
  } catch {
    const proc = await runDnaCli(["info", "tx", hash, "--rpcport", String(rpcPort)]);
    return ok(proc);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const hash = body.hash as string;
  const rpcPort = getRpcPort(body);
  if (!hash) return fail("hash required");

  const proc = await runDnaCli(["info", "status", hash, "--rpcport", String(rpcPort)]);
  return ok(proc);
}
