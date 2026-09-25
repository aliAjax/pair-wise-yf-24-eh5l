import { STORAGE_KEYS } from "../constants/storageKeys";

// 本机仓储：模拟后端 CRUD 的唯一出入口，数据只落在 localStorage，不接第三方 API。
export function readRows<T>(key: keyof typeof STORAGE_KEYS): T[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[key]);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export function writeRows<T>(key: keyof typeof STORAGE_KEYS, rows: T[]): void {
  localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(rows));
}

export function nextId(key: keyof typeof STORAGE_KEYS): number {
  const rows = readRows<{ id: number }>(key);
  return rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
}
