// 会签角色：法务 / 业务，同一人不能顶两个角色。
export const SignatureRole = ["LEGAL", "BUSINESS"] as const;
export type SignatureRole = (typeof SignatureRole)[number];
export const SignatureRoleText: Record<SignatureRole, string> = {
  LEGAL: "法务",
  BUSINESS: "业务"
};
