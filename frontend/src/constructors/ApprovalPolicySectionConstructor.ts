import type { ApprovalPolicySection } from "../types/ApprovalPolicySection";
import type { ParsedSectionDraft } from "../utils/policyContent";

export const createDefaultApprovalPolicySection = (
  overrides: Partial<ApprovalPolicySection> = {}
): ApprovalPolicySection => ({
  id: 0,
  document_id: 0,
  section_no: "",
  heading: "",
  content: "",
  risk_level: "MEDIUM",
  signatures: [],
  ...overrides
});

export const createApprovalPolicySectionForm = createDefaultApprovalPolicySection;
export const createApprovalPolicySectionResponse = createDefaultApprovalPolicySection;

export const createApprovalPolicySectionFromDraft = (
  draft: ParsedSectionDraft,
  id: number,
  documentId: number
): ApprovalPolicySection =>
  createDefaultApprovalPolicySection({
    id,
    document_id: documentId,
    section_no: draft.section_no,
    heading: draft.heading,
    content: draft.content,
    risk_level: draft.risk_level,
    signatures: []
  });
