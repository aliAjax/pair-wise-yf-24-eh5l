import { SignatureRole } from "../constants/SignatureRole";
import type { SignatureRole as SignatureRoleType } from "../constants/SignatureRole";
import type { ApprovalClause } from "../types/ApprovalClause";
import type { ClauseSignature } from "../types/ClauseSignature";

// 工作副本签名与快照内联签名共用同一组结构字段，用结构化最小类型兼容两者。
interface RoleSignatureLike {
  role: SignatureRoleType;
  signer: string;
}

interface ClauseLike {
  id?: number;
  requires_signature: boolean;
}

// 该条款还缺哪些角色签名（仅对高风险条款有意义）。
export function missingRoles<T extends RoleSignatureLike>(signatures: T[]): SignatureRoleType[] {
  const signedRoles = new Set(signatures.map((signature) => signature.role));
  return SignatureRole.filter((role) => !signedRoles.has(role));
}

export function isClauseFullySigned(clause: ApprovalClause, signatures: ClauseSignatureLike[]): boolean {
  if (!clause.requires_signature) return true;
  return missingRoles(signatures).length === 0;
}

type ClauseSignatureLike = RoleSignatureLike & { clause_id?: number };

// 全部高风险条款两类角色各签一次，且每条都由两名不同的人签署，才算会签完成。
export function isVersionFullySigned<T extends ClauseLike, S extends RoleSignatureLike & { clause_id: number }>(
  clauses: T[],
  signatures: S[]
): boolean {
  return clauses
    .filter((clause) => clause.requires_signature)
    .every((clause) => {
      const clauseSignatures = signatures.filter((signature) => signature.clause_id === (clause as { id: number }).id);
      if (missingRoles(clauseSignatures).length > 0) return false;
      const signers = new Set(clauseSignatures.map((signature) => signature.signer.trim()));
      return signers.size >= SignatureRole.length;
    });
}

export function signaturesOfClause(clauseId: number, signatures: ClauseSignature[]): ClauseSignature[] {
  return signatures
    .filter((signature) => signature.clause_id === clauseId)
    .sort((a, b) => SignatureRole.indexOf(a.role) - SignatureRole.indexOf(b.role));
}
