import { nextId, writeRows, readRows } from "./localRepository";
import { createDefaultApprovalAuditLog } from "../constructors/ApprovalAuditLogConstructor";
import type { ApprovalAuditLog } from "../types/ApprovalAuditLog";

// 所有写操作统一留痕：创建 / 覆盖草稿 / 送审 / 签名 / 清签 / 封存均可回看。
export function appendAuditLog(
  action: string,
  detail: string,
  operator: string,
  refs: { version_id?: number | null; clause_id?: number | null } = {}
): ApprovalAuditLog {
  const entry = createDefaultApprovalAuditLog({
    id: nextId("approvalAuditLog"),
    action,
    version_id: refs.version_id ?? null,
    clause_id: refs.clause_id ?? null,
    detail,
    operator,
    created_at: new Date().toISOString()
  });
  const rows = readRows<ApprovalAuditLog>("approvalAuditLog");
  writeRows("approvalAuditLog", [entry, ...rows]);
  return entry;
}

export function listAuditLogs(): ApprovalAuditLog[] {
  return readRows<ApprovalAuditLog>("approvalAuditLog");
}
