import fs from "fs";
import path from "path";
import { DATA_DIR } from "./config";

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function filePath(name: string) {
  return path.join(DATA_DIR, name);
}

export function loadJson<T>(name: string, fallback: T): T {
  ensureDir();
  const fp = filePath(name);
  if (!fs.existsSync(fp)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(fp, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export function saveJson<T>(name: string, data: T): void {
  ensureDir();
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2));
}

export interface HistoryEntry {
  id: number;
  type: string;
  summary: string;
  txHash?: string;
  createdAt: string;
}

export interface ContractEntry {
  id: number;
  name: string;
  address: string;
  codePath?: string;
  vmType?: number;
  createdAt: string;
}

export interface AddressEntry {
  address: string;
  label: string;
  addedAt: string;
}

export function appendHistory(entry: Omit<HistoryEntry, "id" | "createdAt">) {
  const history = loadJson<HistoryEntry[]>("tx_history.json", []);
  history.push({
    ...entry,
    id: history.length + 1,
    createdAt: new Date().toISOString(),
  });
  saveJson("tx_history.json", history.slice(-500));
}

export function appendContract(entry: Omit<ContractEntry, "id" | "createdAt">) {
  const contracts = loadJson<ContractEntry[]>("contract_registry.json", []);
  contracts.push({
    ...entry,
    id: contracts.length + 1,
    createdAt: new Date().toISOString(),
  });
  saveJson("contract_registry.json", contracts);
}

export function getAddressBook(): AddressEntry[] {
  return loadJson<AddressEntry[]>("address_book.json", []);
}

export function saveAddressBook(book: AddressEntry[]) {
  saveJson("address_book.json", book);
}

export function getHistory(): HistoryEntry[] {
  return loadJson<HistoryEntry[]>("tx_history.json", []);
}

export function getContracts(): ContractEntry[] {
  return loadJson<ContractEntry[]>("contract_registry.json", []);
}

export function getBlockHeights(): number[] {
  return loadJson<number[]>("block_heights.json", []);
}

export function appendBlockHeight(height: number) {
  const heights = getBlockHeights();
  const last = heights[heights.length - 1];
  if (last !== height) {
    heights.push(height);
    saveJson("block_heights.json", heights.slice(-200));
  }
}
