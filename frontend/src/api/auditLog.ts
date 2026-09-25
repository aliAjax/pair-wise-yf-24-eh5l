import { STORAGE_KEYS } from "./storageKeys";
import { readStorage, writeStorage } from "./storage";

export interface AuditLogEntry {
  id: number;
  template: string;
  detail: string;
  created_at: string;
}

const listLogs = (): AuditLogEntry[] => readStorage<AuditLogEntry[]>(STORAGE_KEYS.approvalLogs, []);

/** 写操作统一记录审计日志（日志模板来自 constants/logTemplates） */
export const appendLog = (template: string, detail: string, now: string): AuditLogEntry => {
  const logs = listLogs();
  const entry: AuditLogEntry = {
    id: logs.reduce((max, item) => Math.max(max, item.id), 0) + 1,
    template,
    detail,
    created_at: now
  };
  writeStorage(STORAGE_KEYS.approvalLogs, [entry, ...logs].slice(0, 200));
  return entry;
};

export const listAuditLogs = async (): Promise<AuditLogEntry[]> => listLogs();
