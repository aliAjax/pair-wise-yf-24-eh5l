import {
  ApprovalServiceError,
  getApprovalDocument,
  importDraft,
  isHistoricalSnapshot,
  listApprovalDocuments,
  signClause,
  submitDraft,
  updateDraftContent,
  type ImportDraftInput
} from "./ApprovalService";
import { ERROR_CODES } from "../constants/errorCodes";

/** Controller 层异常：在 service 异常之外再包装一层，禁止全局一处吞掉全部异常 */
export class ApprovalControllerError extends Error {
  code: keyof typeof ERROR_CODES;
  cause?: unknown;
  constructor(code: keyof typeof ERROR_CODES, message: string, cause?: unknown) {
    super(message);
    this.code = code;
    this.cause = cause;
    this.name = "ApprovalControllerError";
  }
}

const wrap = <T>(action: () => T): T => {
  try {
    return action();
  } catch (error) {
    if (error instanceof ApprovalServiceError) {
      throw new ApprovalControllerError(error.code, error.message, error);
    }
    throw new ApprovalControllerError("VALIDATION_FAILED", "审批操作执行失败", error);
  }
};

export const approvalController = {
  listDocuments: () => wrap(() => listApprovalDocuments()),
  getDocument: (id: number) => wrap(() => getApprovalDocument(id)),
  importDraft: (input: ImportDraftInput) => wrap(() => importDraft(input)),
  updateDraftContent: (id: number, rawText: string) => wrap(() => updateDraftContent(id, rawText)),
  submitDraft: (id: number) => wrap(() => submitDraft(id)),
  signClause: (input: Parameters<typeof signClause>[0]) => wrap(() => signClause(input)),
  isHistoricalSnapshot: (document: Parameters<typeof isHistoricalSnapshot>[0]) =>
    wrap(() => isHistoricalSnapshot(document, listApprovalDocuments()))
};
