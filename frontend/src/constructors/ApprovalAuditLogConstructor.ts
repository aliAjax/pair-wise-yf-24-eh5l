import type { ApprovalAuditLog } from "../types/ApprovalAuditLog";

const now = () => new Date().toISOString();

export const createDefaultApprovalAuditLog = (overrides: Partial<ApprovalAuditLog> = {}): ApprovalAuditLog => ({
  id: 1 as never,
  action: "UNKNOWN" as never,
  version_id: null,
  clause_id: null,
  detail: "" as never,
  operator: "system" as never,
  created_at: now() as never,
  ...overrides
});

export const createApprovalAuditLogForm = createDefaultApprovalAuditLog;
export const createApprovalAuditLogResponse = createDefaultApprovalAuditLog;
