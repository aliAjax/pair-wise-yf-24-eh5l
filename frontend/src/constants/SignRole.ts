export const SignRole = ["LEGAL", "BUSINESS"] as const;
export type SignRole = (typeof SignRole)[number];
export const SignRoleText: Record<SignRole, string> = {
  LEGAL: "法务",
  BUSINESS: "业务"
};
export const REQUIRED_SIGN_ROLES: readonly SignRole[] = SignRole;
