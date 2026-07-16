import { NextRequest } from "next/server";
import { rpcCall, BlockInfo } from "@/lib/dna-client";
import { runDnaCli } from "@/lib/dna-cli";
import { fail, ok } from "@/lib/api-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || "1";
  const rpcPort = Number(req.nextUrl.searchParams.get("rpcPort") || 20336);
  try {
    const block = await rpcCall<BlockInfo>("getblock", [isNaN(Number(query)) ? query : Number(query), 1], rpcPort);
    return ok({ block });
  } catch {
    const proc = await runDnaCli(["info", "block", query, "--rpcport", String(rpcPort)]);
    return ok(proc);
  }
}
