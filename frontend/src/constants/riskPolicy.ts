import { PrivacyRiskLevel } from "./PrivacyRiskLevel";
import type { PrivacyRiskLevel as PrivacyRiskLevelType } from "../types/PrivacyRiskLevel";

/** 高风险条款：需法务与业务双签 */
export const HIGH_RISK_LEVELS: readonly PrivacyRiskLevelType[] = [PrivacyRiskLevel[2], PrivacyRiskLevel[3]];

export const isHighRisk = (riskLevel: PrivacyRiskLevelType): boolean =>
  HIGH_RISK_LEVELS.includes(riskLevel);
