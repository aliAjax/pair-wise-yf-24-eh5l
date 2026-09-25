// 会签角色：每个高风险条款必须两类角色各签一次。
export const SignatureRole = ["LEGAL", "BUSINESS"] as const;
export type SignatureRole = (typeof SignatureRole)[number];
export const SignatureRoleText: Record<SignatureRole, string> = {
  LEGAL: "法务",
  BUSINESS: "业务"
};
