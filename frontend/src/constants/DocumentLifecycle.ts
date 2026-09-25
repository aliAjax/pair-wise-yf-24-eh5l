export const DocumentLifecycle = ["DRAFT", "SUBMITTED"] as const;
export type DocumentLifecycle = (typeof DocumentLifecycle)[number];
export const DocumentLifecycleText: Record<DocumentLifecycle, string> = {
  DRAFT: "草稿",
  SUBMITTED: "已送审"
};
