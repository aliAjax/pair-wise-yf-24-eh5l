import type { ApprovalVersion } from "../types/ApprovalVersion";

const now = () => new Date().toISOString();

export const createDefaultApprovalVersion = (overrides: Partial<ApprovalVersion> = {}): ApprovalVersion => ({
  id: 1 as never,
  title: "新版隐私政策" as never,
  version_label: "v1.0-draft" as never,
  phase: "DRAFT" as never,
  source_document_id: null,
  submission_round: 0,
  submitted_at: null,
  completed_at: null,
  created_at: now() as never,
  updated_at: now() as never,
  ...overrides
});

export const createApprovalVersionForm = createDefaultApprovalVersion;
export const createApprovalVersionResponse = createDefaultApprovalVersion;
