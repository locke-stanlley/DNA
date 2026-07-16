import { NextRequest } from "next/server";
import { rpcCall } from "@/lib/dna-client";
import { fail, ok, readBody } from "@/lib/api-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const body = await readBody<{ method?: string; params?: unknown[]; rpcPort?: number }>(req);
  const method = body.method;
  const params = body.params || [];
  const rpcPort = Number(body.rpcPort || 20336);
  if (!method) return fail("method required");
  try {
    const result = await rpcCall(method, params, rpcPort);
    return ok({ result });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "RPC failed", 502);
  }
}
