import { PrivacyRiskLevel } from "../constants/PrivacyRiskLevel";
import type { ApprovalClause } from "../types/ApprovalClause";

const HIGH_RISK_LEVELS: string[] = [PrivacyRiskLevel[2], PrivacyRiskLevel[3]];

export const isHighRiskLevel = (risk_level: string): boolean => HIGH_RISK_LEVELS.includes(risk_level);

const now = () => new Date().toISOString();

export const createDefaultApprovalClause = (overrides: Partial<ApprovalClause> = {}): ApprovalClause => {
  const risk_level = (overrides.risk_level ?? "LOW") as string;
  return {
    id: 1 as never,
    version_id: 1 as never,
    section_no: "1" as never,
    heading: "heading 1" as never,
    content: "content 1" as never,
    category: "通用" as never,
    risk_level,
    requires_signature: isHighRiskLevel(risk_level),
    body_changed_at: null,
    updated_at: now(),
    ...overrides
  };
};

export const createApprovalClauseForm = createDefaultApprovalClause;
export const createApprovalClauseResponse = createDefaultApprovalClause;
