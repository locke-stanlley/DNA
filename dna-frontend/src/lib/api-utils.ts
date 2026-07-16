import { NextResponse } from "next/server";

export function ok(data: object = {}, status = 200) {
  return NextResponse.json({ ...(data as Record<string, unknown>), ok: true }, { status });
}

export function fail(error: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

export async function readBody<T extends Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

export function getRpcPort(body: Record<string, unknown>, fallback = 20336): number {
  return Number(body.rpcPort || fallback);
}

export function getWallet(body: Record<string, unknown>): string {
  return (body.walletPath as string) || process.env.DNA_WALLET || "/workspaces/DNA/node1/wallet.dat";
}

export function getPassword(body: Record<string, unknown>): string {
  return (body.password as string) || process.env.DNA_WALLET_PASSWORD || "123456";
}
