import { computed } from "vue";
import type { ApprovalPolicyDocument } from "../types/ApprovalPolicyDocument";
import type { ApprovalPolicySection } from "../types/ApprovalPolicySection";
import { isHighRisk } from "../constants/riskPolicy";
import { REQUIRED_SIGN_ROLES } from "../types/SignRole";
import { missingRoles } from "../utils/formatters";

export interface ClauseReviewView {
  section: ApprovalPolicySection;
  highRisk: boolean;
  signedRoles: string[];
  missingRoleCodes: string[];
  complete: boolean;
}

/** 审核页视图模型：按条款汇总已签角色、缺少角色与会签完成度 */
export function useApprovalReview(document: () => ApprovalPolicyDocument | null | undefined) {
  const clauseViews = computed<ClauseReviewView[]>(() => {
    const doc = document();
    if (!doc) return [];
    return doc.sections.map((section) => {
      const highRisk = isHighRisk(section.risk_level);
      const missing = missingRoles(section);
      return {
        section,
        highRisk,
        signedRoles: section.signatures.map((item) => item.role),
        missingRoleCodes: missing.map((role) => role),
        complete: !highRisk || missing.length === 0
      };
    });
  });

  const highRiskClauses = computed(() => clauseViews.value.filter((view) => view.highRisk));
  const completeClauses = computed(() => highRiskClauses.value.filter((view) => view.complete));
  const pendingClauses = computed(() => highRiskClauses.value.filter((view) => !view.complete));
  const allSigned = computed(
    () => highRiskClauses.value.length > 0 && pendingClauses.value.length === 0
  );
  const totalRequiredSignatures = computed(() => highRiskClauses.value.length * REQUIRED_SIGN_ROLES.length);

  return {
    clauseViews,
    highRiskClauses,
    completeClauses,
    pendingClauses,
    allSigned,
    totalRequiredSignatures
  };
}
