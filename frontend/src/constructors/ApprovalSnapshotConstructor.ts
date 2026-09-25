import type { ApprovalSnapshot, SnapshotClause } from "../types/ApprovalSnapshot";
import type { ApprovalVersion } from "../types/ApprovalVersion";
import type { ApprovalClause } from "../types/ApprovalClause";
import type { ClauseSignature } from "../types/ClauseSignature";
import { SignatureRole } from "../constants/SignatureRole";

const now = () => new Date().toISOString();

export const createDefaultApprovalSnapshot = (overrides: Partial<ApprovalSnapshot> = {}): ApprovalSnapshot => ({
  id: 1 as never,
  version_id: 1 as never,
  title: "新版隐私政策" as never,
  version_label: "v1.0" as never,
  round: 1 as never,
  phase_at_freeze: "SUBMITTED" as never,
  frozen_at: now() as never,
  clauses: [] as SnapshotClause[],
  ...overrides
});

// 快照冻结构造器：把送审时点的条款与已收集签名整体深拷贝封存，
// 之后工作副本任何变化都不会回写到快照。
export const createFrozenSnapshot = (
  version: ApprovalVersion,
  clauses: ApprovalClause[],
  signatures: ClauseSignature[],
  overrides: Partial<ApprovalSnapshot> = {}
): ApprovalSnapshot => {
  const frozenClauses: SnapshotClause[] = clauses
    .slice()
    .sort((a, b) => a.section_no.localeCompare(b.section_no, "zh-CN", { numeric: true }))
    .map((clause) => ({
      section_no: clause.section_no,
      heading: clause.heading,
      content: clause.content,
      category: clause.category,
      risk_level: clause.risk_level,
      requires_signature: clause.requires_signature,
      signatures: signatures
        .filter((signature) => signature.clause_id === clause.id)
        .sort((a, b) => SignatureRole.indexOf(a.role) - SignatureRole.indexOf(b.role))
        .map((signature) => ({
          role: signature.role,
          signer: signature.signer,
          signed_at: signature.signed_at,
          content_fingerprint: signature.content_fingerprint
        }))
    }));

  return createDefaultApprovalSnapshot({
    version_id: version.id,
    title: version.title,
    version_label: version.version_label,
    round: version.submission_round,
    phase_at_freeze: version.phase,
    frozen_at: now(),
    clauses: frozenClauses,
    ...overrides
  });
};
