import type { PrivacyRiskLevel } from "./PrivacyRiskLevel";
import type { ClauseSignature } from "./ClauseSignature";

/**
 * 审批工作流用条款段落。
 * 仅 risk_level 为 HIGH / CRITICAL 的高风险条款需要法务、业务双签。
 */
export interface ApprovalPolicySection {
  id: number;
  document_id: number;
  section_no: string;
  heading: string;
  content: string;
  risk_level: PrivacyRiskLevel;
  signatures: ClauseSignature[];
}
