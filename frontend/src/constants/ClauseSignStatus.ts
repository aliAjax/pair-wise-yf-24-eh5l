export const ClauseSignStatus = ["PENDING", "SIGNED"] as const;
export type ClauseSignStatus = (typeof ClauseSignStatus)[number];
export const ClauseSignStatusText: Record<ClauseSignStatus, string> = {
  PENDING: "待签",
  SIGNED: "已签"
};
