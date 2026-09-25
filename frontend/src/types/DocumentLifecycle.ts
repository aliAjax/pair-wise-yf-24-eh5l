export const DocumentLifecycle = ["DRAFT", "SUBMITTED"] as const;
export type DocumentLifecycle = (typeof DocumentLifecycle)[number];
export const DocumentLifecycleText: Record<DocumentLifecycle, string> = Object.fromEntries(
  DocumentLifecycle.map((value) => [value, value === "DRAFT" ? "草稿" : "已送审"])
) as Record<DocumentLifecycle, string>;
