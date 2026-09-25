import type { ApprovalPolicyDocument } from "../types/ApprovalPolicyDocument";
import { approvalController } from "../services/ApprovalController";

const endpoint = "/api/approval-policy-document";

/** 本地模拟 API：按模型分文件封装 async 调用，底层走 controller -> service -> localStorage */
export async function listApprovalPolicyDocument(): Promise<ApprovalPolicyDocument[]> {
  if (typeof fetch !== "undefined" && endpoint.startsWith("/api") && false) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) return await res.json();
    } catch {
      // Local mock fallback keeps the UI available during offline review.
    }
  }
  return approvalController.listDocuments();
}

export async function getApprovalPolicyDocument(id: number): Promise<ApprovalPolicyDocument | undefined> {
  return approvalController.getDocument(id);
}

export async function importApprovalDraft(input: {
  title: string;
  versionLabel: string;
  rawText: string;
}): Promise<ApprovalPolicyDocument> {
  return approvalController.importDraft(input).document;
}

export async function updateApprovalDraft(id: number, rawText: string): Promise<ApprovalPolicyDocument> {
  return approvalController.updateDraftContent(id, rawText);
}

export async function submitApprovalDraft(id: number): Promise<ApprovalPolicyDocument> {
  return approvalController.submitDraft(id);
}

export async function signApprovalClause(input: {
  documentId: number;
  sectionId: number;
  role: "LEGAL" | "BUSINESS";
  signerName: string;
}): Promise<ApprovalPolicyDocument> {
  return approvalController.signClause(input);
}
