import type { ApprovalVersion } from "../types/ApprovalVersion";
import { readRows, writeRows } from "../utils/localRepository";

// 工作版本仓储。快照的冻结/只读约束在 service 层保证，仓储不做业务裁决。
export async function listApprovalVersion(): Promise<ApprovalVersion[]> {
  return readRows<ApprovalVersion>("approvalVersion");
}

export async function writeApprovalVersions(rows: ApprovalVersion[]): Promise<void> {
  writeRows("approvalVersion", rows);
}

export async function getApprovalVersion(id: number): Promise<ApprovalVersion | undefined> {
  return (await listApprovalVersion()).find((row) => row.id === id);
}
