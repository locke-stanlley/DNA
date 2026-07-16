import { NextRequest } from "next/server";
import { NODE_PORTS } from "@/lib/config";
import { runDnaCli } from "@/lib/dna-cli";
import { fail, ok, readBody } from "@/lib/api-utils";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const nodeId = req.nextUrl.searchParams.get("id") || "node1";
  const logPath = path.join("/workspaces/DNA", nodeId, "node.log");
  if (!fs.existsSync(logPath)) return ok({ ok: false, lines: [], error: "Log not found" });
  const content = fs.readFileSync(logPath, "utf-8");
  const lines = content.split("\n").slice(-300);
  return ok({ ok: true, lines, total: content.split("\n").length });
}

export async function POST(req: NextRequest) {
  const body = await readBody<{ action?: string; nodeId?: string }>(req);
  const action = body.action || "status";

  if (action === "start") {
    try {
      await execAsync("./scripts/run_multi_node_test.sh", { cwd: "/workspaces/DNA" });
    } catch {
      /* script may exit non-zero */
    }
    return ok({ message: "Network launch initiated" });
  }

  if (action === "stop") {
    try {
      await execAsync("pkill -f 'dnaNode --config config.json'");
    } catch {
      /* ignore */
    }
    return ok({ message: "Stop signal sent" });
  }

  if (action === "height") {
    const nodeId = body.nodeId || "node1";
    const ports = NODE_PORTS[nodeId];
    if (!ports) return fail("Unknown node");
    const proc = await runDnaCli(["info", "curblockheight", "--rpcport", String(ports.rpc)]);
    return ok(proc);
  }

  return fail("Unknown action");
}
