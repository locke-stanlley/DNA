import { NextRequest } from "next/server";
import { rpcCall, BlockInfo } from "@/lib/dna-client";
import { runDnaCli, extractInt } from "@/lib/dna-cli";
import { fail, getRpcPort, ok, readBody } from "@/lib/api-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const rpcPort = Number(req.nextUrl.searchParams.get("rpcPort") || 20336);
  try {
    const [height, count, bestHash, gasPrice, networkId, connections, mempoolCount] = await Promise.all([
      rpcCall<number>("getblockcount", [], rpcPort),
      rpcCall<number>("getblockcount", [], rpcPort),
      rpcCall<string>("getbestblockhash", [], rpcPort),
      rpcCall<number>("getgasprice", [], rpcPort).catch(() => 0),
      rpcCall<number>("getnetworkid", [], rpcPort).catch(() => 0),
      rpcCall<number>("getconnectioncount", [], rpcPort).catch(() => 0),
      rpcCall<number>("getmempooltxcount", [], rpcPort).catch(() => 0),
    ]);
    return ok({ height, blockCount: count, bestHash, gasPrice, networkId, connections, mempoolCount, rpcPort });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Blockchain query failed", 503);
  }
}

export async function POST(req: NextRequest) {
  const body = await readBody<Record<string, unknown>>(req);
  const action = body.action as string;
  const rpcPort = getRpcPort(body);

  if (action === "height") {
    const proc = await runDnaCli(["info", "curblockheight", "--rpcport", String(rpcPort)]);
    return ok({ ...proc, height: extractInt(proc.stdout) });
  }

  if (action === "block") {
    const query = String(body.query || body.height || "1");
    const proc = await runDnaCli(["info", "block", query, "--rpcport", String(rpcPort)]);
    return ok(proc);
  }

  if (action === "import") {
    const filePath = body.filePath as string;
    if (!filePath) return fail("filePath required");
    const proc = await runDnaCli([
      "import", "--importfile", filePath,
      "--data-dir", "/workspaces/DNA/Chain",
      "--config", "/workspaces/DNA/config.json",
    ]);
    return ok(proc);
  }

  if (action === "export") {
    const filePath = (body.filePath as string) || "/workspaces/DNA/Blocks_export.dat";
    const proc = await runDnaCli([
      "export", "--exportfile", filePath,
      "--startheight", String(body.startHeight || "0"),
      "--endheight", String(body.endHeight || "0"),
      "--rpcport", String(rpcPort),
    ]);
    return ok({ ...proc, filePath });
  }

  return fail("Unknown action");
}
