export const VersionPhase = ["DRAFT", "SUBMITTED", "COMPLETED"] as const;
export type VersionPhase = (typeof VersionPhase)[number];
export const VersionPhaseText: Record<VersionPhase, string> = {
  DRAFT: "草稿（本机）",
  SUBMITTED: "已送审·待签",
  COMPLETED: "会签完成"
};
