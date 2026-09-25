import type { ApprovalClause } from "../types/ApprovalClause";
import { readRows, writeRows } from "../utils/localRepository";

export async function listApprovalClause(): Promise<ApprovalClause[]> {
  return readRows<ApprovalClause>("approvalClause");
}

export async function listApprovalClauseByVersion(versionId: number): Promise<ApprovalClause[]> {
  return (await listApprovalClause()).filter((row) => row.version_id === versionId);
}

export async function writeApprovalClauses(rows: ApprovalClause[]): Promise<void> {
  writeRows("approvalClause", rows);
}
