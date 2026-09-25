// 本机持久化键名集中管理：草稿、快照、签名、审计日志全部只存 localStorage。
export const STORAGE_KEYS = {
  policyDocument: "policy-diff:policyDocument",
  policySection: "policy-diff:policySection",
  approvalVersion: "policy-diff:approvalVersion",
  approvalClause: "policy-diff:approvalClause",
  clauseSignature: "policy-diff:clauseSignature",
  approvalSnapshot: "policy-diff:approvalSnapshot",
  approvalAuditLog: "policy-diff:approvalAuditLog",
  currentUser: "policy-diff:currentUser",
  sequence: "policy-diff:sequence"
} as const;
