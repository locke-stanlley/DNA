import { DEFAULT_RPC_PORT } from "./config";

export interface RpcResponse<T = unknown> {
  desc?: string;
  error: number;
  id: string | number;
  jsonrpc: string;
  result?: T;
}

export async function rpcCall<T = unknown>(
  method: string,
  params: unknown[] = [],
  rpcPort = DEFAULT_RPC_PORT
): Promise<T> {
  const res = await fetch(`http://127.0.0.1:${rpcPort}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
    cache: "no-store",
  });
  const data: RpcResponse<T> = await res.json();
  if (data.error !== 0) {
    throw new Error(data.desc || `RPC error ${data.error}`);
  }
  return data.result as T;
}

export async function restGet<T = unknown>(path: string, restPort: number): Promise<T> {
  const res = await fetch(`http://127.0.0.1:${restPort}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`REST ${path} failed: ${res.status}`);
  return res.json();
}

export interface BalanceResult {
  ont?: string;
  gas?: string;
  height?: string;
}

export interface TxStateResult {
  TxHash: string;
  State: number;
  GasConsumed: number;
  Notify?: Array<{ ContractAddress: string; States: unknown[] }>;
}

export interface BlockHeader {
  Height: number;
  Hash: string;
  Timestamp: number;
  PrevBlockHash: string;
  NextBookkeeper: string;
}

export interface BlockInfo {
  Hash: string;
  Size: number;
  Header: BlockHeader;
  Transactions: unknown[];
}
