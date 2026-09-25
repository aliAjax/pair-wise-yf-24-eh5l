export const SignRole = ["LEGAL", "BUSINESS"] as const;
export type SignRole = (typeof SignRole)[number];
export const SignRoleText: Record<SignRole, string> = {
  LEGAL: "法务",
  BUSINESS: "业务"
};
/** 高风险条款要求的会签角色（顺序固定，用于计算缺少的角色） */
export const REQUIRED_SIGN_ROLES: readonly SignRole[] = SignRole;
