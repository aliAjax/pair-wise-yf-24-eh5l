import type { ClauseSignature } from "../types/ClauseSignature";
import { readRows, writeRows } from "../utils/localRepository";

export async function listClauseSignature(): Promise<ClauseSignature[]> {
  return readRows<ClauseSignature>("clauseSignature");
}

export async function listClauseSignatureByVersion(versionId: number): Promise<ClauseSignature[]> {
  return (await listClauseSignature()).filter((row) => row.version_id === versionId);
}

export async function writeClauseSignatures(rows: ClauseSignature[]): Promise<void> {
  writeRows("clauseSignature", rows);
}
