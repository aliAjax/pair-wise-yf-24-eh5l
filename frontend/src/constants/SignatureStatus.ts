export const SignatureStatus = ["UNSIGNED", "SIGNED"] as const;
export type SignatureStatus = (typeof SignatureStatus)[number];
export const SignatureStatusText: Record<SignatureStatus, string> = {
  UNSIGNED: "待签",
  SIGNED: "已签"
};
