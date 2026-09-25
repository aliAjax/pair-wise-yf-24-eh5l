import type { SignRole } from "../types/SignRole";
import { REQUIRED_SIGN_ROLES } from "../types/SignRole";
import type { ApprovalPolicySection } from "../types/ApprovalPolicySection";
import type { ClauseSignature } from "../types/ClauseSignature";
import { isHighRisk } from "../constants/riskPolicy";
import { SignRoleText } from "../constants/SignRole";
import { ClauseSignStatusText } from "../constants/ClauseSignStatus";

export const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString("zh-CN") : "—";
export const formatStatus = (value: string) => value.replace(/_/g, " ");
export const formatNumber = (value: number) => new Intl.NumberFormat("zh-CN").format(value);
export const formatRisk = (value: string): string => {
  const riskText: Record<string, string> = {
    LOW: "低",
    MEDIUM: "中",
    HIGH: "高",
    CRITICAL: "严重",
    EXTREME: "极高"
  };
  return riskText[value] ?? value;
};

export const formatRole = (role: SignRole): string => SignRoleText[role];
export const formatSignStatus = (value: string): string =>
  ClauseSignStatusText[value as keyof typeof ClauseSignStatusText] ?? value;

/** 条款正文是否需要会签 */
export const formatSectionSignStatus = (section: ApprovalPolicySection): string => {
  if (!isHighRisk(section.risk_level)) return "无需会签";
  return missingRoles(section).length === 0
    ? ClauseSignStatusText.SIGNED
    : ClauseSignStatusText.PENDING;
};

/** 高风险条款还缺少哪些角色（已签角色之外的固定两类角色） */
export const missingRoles = (section: ApprovalPolicySection): SignRole[] => {
  if (!isHighRisk(section.risk_level)) return [];
  const signedRoles = new Set(section.signatures.map((item) => item.role));
  return REQUIRED_SIGN_ROLES.filter((role) => !signedRoles.has(role));
};

export const formatMissingRoles = (section: ApprovalPolicySection): string => {
  const missing = missingRoles(section);
  return missing.length === 0 ? "—" : missing.map(formatRole).join("、");
};

/** 签名人展示：角色 签名人（时间） */
export const formatSigner = (signature: ClauseSignature): string =>
  `${SignRoleText[signature.role]} ${signature.signer_name}（${formatDate(signature.signed_at)}）`;
