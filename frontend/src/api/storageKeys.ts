/** localStorage 键名集中管理：草稿与只读快照分开存储 */
export const STORAGE_KEYS = {
  approvalDocuments: "policy-diff:approval-documents",
  approvalSequences: "policy-diff:approval-sequences",
  approvalLogs: "policy-diff:approval-logs"
} as const;
