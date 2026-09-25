import type { ApprovalPolicyDocument } from "../types/ApprovalPolicyDocument";
import type { ApprovalPolicySection } from "../types/ApprovalPolicySection";

export const createDefaultApprovalPolicyDocument = (
  overrides: Partial<ApprovalPolicyDocument> = {}
): ApprovalPolicyDocument => ({
  id: 0,
  doc_key: "",
  title: "",
  version_label: "",
  raw_text: "",
  lifecycle: "DRAFT",
  imported_at: new Date("2026-09-25T09:00:00Z").toISOString(),
  updated_at: new Date("2026-09-25T09:00:00Z").toISOString(),
  submitted_at: null,
  snapshot_seq: 0,
  sections: [],
  ...overrides
});

/** 导入表单对象 */
export const createApprovalPolicyDocumentForm = (
  overrides: Partial<ApprovalPolicyDocument> = {}
): ApprovalPolicyDocument => createDefaultApprovalPolicyDocument({ lifecycle: "DRAFT", ...overrides });

/** 送审响应对象：深拷贝草稿内容并冻结为只读快照 */
export const createSubmittedSnapshot = (
  draft: ApprovalPolicyDocument,
  snapshotSeq: number,
  now: string
): ApprovalPolicyDocument =>
  createDefaultApprovalPolicyDocument({
    id: draft.id,
    doc_key: draft.doc_key,
    title: draft.title,
    version_label: draft.version_label,
    raw_text: draft.raw_text,
    lifecycle: "SUBMITTED",
    imported_at: draft.imported_at,
    updated_at: now,
    submitted_at: now,
    snapshot_seq: snapshotSeq,
    sections: draft.sections.map((section) => ({ ...section, signatures: [...section.signatures] }))
  });

export const createApprovalPolicyDocumentResponse = createDefaultApprovalPolicyDocument;

export const createDocumentFromDraftInput = (params: {
  id: number;
  title: string;
  versionLabel: string;
  rawText: string;
  sections: ApprovalPolicySection[];
  now: string;
}): ApprovalPolicyDocument =>
  createDefaultApprovalPolicyDocument({
    id: params.id,
    doc_key: buildDocKey(params.title, params.versionLabel),
    title: params.title,
    version_label: params.versionLabel,
    raw_text: params.rawText,
    lifecycle: "DRAFT",
    imported_at: params.now,
    updated_at: params.now,
    submitted_at: null,
    snapshot_seq: 0,
    sections: params.sections
  });

/** 同一份新版标识：标题 + 版本号（空白归一后比对） */
export const buildDocKey = (title: string, versionLabel: string): string =>
  `${title.trim()}__${versionLabel.trim()}`.toLowerCase();
