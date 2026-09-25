import type { VersionPhase } from "../constants/VersionPhase";
import type { SignatureRole } from "../constants/SignatureRole";
import type { PrivacyRiskLevel } from "../constants/PrivacyRiskLevel";

// 只读快照条款：送审时整体冻结，之后工作版本再怎么改都不影响快照内容。
export interface SnapshotClause {
  section_no: string;
  heading: string;
  content: string;
  category: string;
  risk_level: PrivacyRiskLevel | string;
  requires_signature: boolean;
  // 冻结时点该条款已收集到的签名（送审时可能为空，签署过程中追加封存）。
  signatures: SnapshotSignature[];
}

export interface SnapshotSignature {
  role: SignatureRole;
  signer: string;
  signed_at: string;
  content_fingerprint: string;
}

// 历史快照：一旦形成即为只读，可回看，不能再改、不能再签。
export interface ApprovalSnapshot {
  id: number;
  version_id: number;
  title: string;
  version_label: string;
  round: number;
  phase_at_freeze: VersionPhase;
  frozen_at: string;
  clauses: SnapshotClause[];
}
