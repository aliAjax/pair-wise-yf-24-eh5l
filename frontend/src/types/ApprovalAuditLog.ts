// 写操作审计日志：所有创建 / 覆盖 / 送审 / 签名 / 重置 / 封存动作都留痕，只存本机。
export interface ApprovalAuditLog {
  id: number;
  action: string;
  version_id: number | null;
  clause_id: number | null;
  detail: string;
  operator: string;
  created_at: string;
}
