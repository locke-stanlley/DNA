export const DNA_ROOT = process.env.DNA_ROOT || "/workspaces/DNA";
export const DNA_NODE_BIN = process.env.DNA_NODE_BIN || `${DNA_ROOT}/dnaNode`;
export const DEFAULT_WALLET = process.env.DNA_WALLET || `${DNA_ROOT}/node1/wallet.dat`;
export const DEFAULT_PASSWORD = process.env.DNA_WALLET_PASSWORD || "123456";
export const DEFAULT_RPC_PORT = Number(process.env.DNA_RPC_PORT || 20336);
export const DEFAULT_REST_PORT = Number(process.env.DNA_REST_PORT || 20334);

export const NODE_PORTS: Record<string, { rpc: number; rest: number; p2p: number }> = {
  node1: { rpc: 20336, rest: 20334, p2p: 20338 },
  node2: { rpc: 20436, rest: 20434, p2p: 20438 },
  node3: { rpc: 20536, rest: 20534, p2p: 20538 },
  node4: { rpc: 20636, rest: 20634, p2p: 20638 },
  node5: { rpc: 20736, rest: 20734, p2p: 20738 },
};

export const DATA_DIR = `${DNA_ROOT}/dna-frontend/data`;
export const BOOTSTRAP_URL = process.env.DNA_BOOTSTRAP_URL || "http://127.0.0.1:8090";
export const BOOTSTRAP_LISTEN = process.env.DNA_BOOTSTRAP_LISTEN || "0.0.0.0:8090";
