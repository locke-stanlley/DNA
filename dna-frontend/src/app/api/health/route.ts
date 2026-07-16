import { NextRequest } from "next/server";
import { NODE_PORTS } from "@/lib/config";
import { rpcCall } from "@/lib/dna-client";
import { extractInt, runDnaCli } from "@/lib/dna-cli";
import { appendBlockHeight, getBlockHeights, getContracts, getHistory } from "@/lib/storage";
import { fail, ok } from "@/lib/api-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

async function queryNode(id: string, ports: { rpc: number; rest: number; p2p: number }) {
  try {
    const [height, connections] = await Promise.all([
      rpcCall<number>("getblockcount", [], ports.rpc),
      rpcCall<number>("getconnectioncount", [], ports.rpc).catch(() => 0),
    ]);
    return {
      id,
      label: id.replace("node", "Node "),
      host: "127.0.0.1",
      ...ports,
      height: height || 0,
      connections,
      online: height > 0,
    };
  } catch {
    try {
      const proc = await runDnaCli(["info", "curblockheight", "--rpcport", String(ports.rpc)]);
      const height = proc.ok ? extractInt(proc.stdout) : 0;
      return {
        id,
        label: id.replace("node", "Node "),
        host: "127.0.0.1",
        ...ports,
        height,
        connections: 0,
        online: proc.ok && height > 0,
      };
    } catch {
      return {
        id,
        label: id.replace("node", "Node "),
        host: "127.0.0.1",
        ...ports,
        height: 0,
        connections: 0,
        online: false,
      };
    }
  }
}

export async function GET() {
  try {
    const nodes = await Promise.all(
      Object.entries(NODE_PORTS).map(([id, ports]) => queryNode(id, ports))
    );

    const onlineNodes = nodes.filter((n) => n.online);
    const latestBlock = Math.max(...nodes.map((n) => n.height), 0);
    if (latestBlock > 0) appendBlockHeight(latestBlock);

    let networkId = 0;
    let version = "";
    let gasPrice = 0;
    let mempoolCount = 0;

    if (onlineNodes.length > 0) {
      const port = onlineNodes[0].rpc;
      const [nid, ver, gas, mem] = await Promise.allSettled([
        rpcCall<number>("getnetworkid", [], port),
        rpcCall<string>("getversion", [], port),
        rpcCall<any>("getgasprice", [], port),
        rpcCall<number>("getmempooltxcount", [], port),
      ]);
      if (nid.status === "fulfilled") networkId = nid.value;
      if (ver.status === "fulfilled") version = ver.value;
      if (gas.status === "fulfilled") {
        const val = gas.value;
        if (val && typeof val === "object" && "gasprice" in val) {
          gasPrice = (val as any).gasprice;
        } else {
          gasPrice = Number(val || 0);
        }
      }
      if (mem.status === "fulfilled") mempoolCount = mem.value;
    }

    return ok({
      nodes,
      latestBlock,
      networkOnline: onlineNodes.length > 0,
      onlineCount: onlineNodes.length,
      totalCount: nodes.length,
      networkId,
      version,
      gasPrice,
      mempoolCount,
      history: getHistory().slice(-20),
      contracts: getContracts(),
      blockHistory: getBlockHeights(),
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Health check failed", 500);
  }
}

export async function POST(_req: NextRequest) {
  return GET();
}
