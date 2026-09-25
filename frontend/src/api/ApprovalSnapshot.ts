import { ERROR_CODES } from "../constants/errorCodes";
import { ApprovalRepositoryError } from "../utils/errors";
import type { ApprovalSnapshot } from "../types/ApprovalSnapshot";
import { readRows, writeRows } from "../utils/localRepository";

export async function listApprovalSnapshot(): Promise<ApprovalSnapshot[]> {
  return readRows<ApprovalSnapshot>("approvalSnapshot");
}

export async function listApprovalSnapshotByVersion(versionId: number): Promise<ApprovalSnapshot[]> {
  return (await listApprovalSnapshot())
    .filter((row) => row.version_id === versionId)
    .sort((a, b) => a.round - b.round);
}

export async function getApprovalSnapshot(id: number): Promise<ApprovalSnapshot | undefined> {
  return (await listApprovalSnapshot()).find((row) => row.id === id);
}

// 快照只能由 service 层在送审 / 签署封存时追加写入。
export async function appendApprovalSnapshot(snapshot: ApprovalSnapshot): Promise<ApprovalSnapshot> {
  const rows = await listApprovalSnapshot();
  if (rows.some((row) => row.id === snapshot.id)) {
    throw new ApprovalRepositoryError(ERROR_CODES.SNAPSHOT_READONLY);
  }
  writeRows("approvalSnapshot", [...rows, snapshot]);
  return snapshot;
}

// 会签进行中，仅允许把最新一轮快照原地追加签名封存；
// 已完成会签或历史轮次快照一律只读，调用方负责裁决，仓储只执行替换。
export async function replaceLatestSnapshot(snapshot: ApprovalSnapshot): Promise<ApprovalSnapshot> {
  const rows = await listApprovalSnapshot();
  const index = rows.findIndex((row) => row.id === snapshot.id);
  if (index < 0) throw new ApprovalRepositoryError(ERROR_CODES.SNAPSHOT_READONLY);
  rows[index] = snapshot;
  writeRows("approvalSnapshot", rows);
  return snapshot;
}
