import { defineStore } from "pinia";
import { approvalController, ApprovalControllerError } from "../services/ApprovalController";
import type { ApprovalPolicyDocument } from "../types/ApprovalPolicyDocument";
import { ensureSeedStorage } from "../api/storage";
import { STORAGE_KEYS } from "../api/storageKeys";
import { approvalSeedDocuments, approvalSeedSequences } from "../mocks/approvalSeed";

interface ActionFeedback {
  type: "success" | "error";
  message: string;
}

interface ImportFeedback extends ActionFeedback {
  overwritten?: boolean;
  resetSectionNos?: string[];
}

/**
 * 审批文档 store：
 * - documents 同时容纳本机草稿与只读快照（按 doc_key + lifecycle 区分）
 * - 当前选中文档供审核页 / 历史回看共用
 */
export const useApprovalStore = defineStore("approval", {
  state: () => ({
    documents: [] as ApprovalPolicyDocument[],
    selectedId: null as number | null,
    loading: false,
    feedback: null as ImportFeedback | null
  }),
  getters: {
    drafts: (state) => state.documents.filter((item) => item.lifecycle === "DRAFT"),
    snapshots: (state) =>
      [...state.documents.filter((item) => item.lifecycle === "SUBMITTED")].sort(
        (a, b) => (b.submitted_at ?? "").localeCompare(a.submitted_at ?? "")
      ),
    selected: (state) => state.documents.find((item) => item.id === state.selectedId) ?? null,
    /** 每个 doc_key 的最新快照才可签署，更早的快照为历史快照 */
    latestSnapshotSeqByKey: (state) => {
      const map: Record<string, number> = {};
      for (const doc of state.documents) {
        if (doc.lifecycle === "SUBMITTED") {
          map[doc.doc_key] = Math.max(map[doc.doc_key] ?? 0, doc.snapshot_seq);
        }
      }
      return map;
    }
  },
  actions: {
    load() {
      this.loading = true;
      ensureSeedStorage(
        STORAGE_KEYS.approvalDocuments,
        STORAGE_KEYS.approvalSequences,
        approvalSeedDocuments,
        approvalSeedSequences
      );
      this.documents = approvalController.listDocuments();
      if (this.selectedId === null && this.documents.length > 0) {
        this.selectedId = this.documents[0].id;
      }
      this.loading = false;
    },
    select(id: number) {
      this.selectedId = id;
    },
    clearFeedback() {
      this.feedback = null;
    },
    importDraft(payload: { title: string; versionLabel: string; rawText: string }) {
      try {
        const result = approvalController.importDraft(payload);
        this.documents = approvalController.listDocuments();
        this.selectedId = result.document.id;
        this.feedback = {
          type: "success",
          message: result.overwritten
            ? `已覆盖本机草稿《${result.document.title}》${result.document.version_label}`
            : `已导入草稿《${result.document.title}》${result.document.version_label}`,
          overwritten: result.overwritten,
          resetSectionNos: result.resetSectionNos
        };
      } catch (error) {
        this.feedback = { type: "error", message: this.toMessage(error) };
      }
    },
    updateDraft(id: number, rawText: string): boolean {
      try {
        approvalController.updateDraftContent(id, rawText);
        this.documents = approvalController.listDocuments();
        this.feedback = { type: "success", message: "草稿已保存（未送审，仅覆盖本机草稿）" };
        return true;
      } catch (error) {
        this.feedback = { type: "error", message: this.toMessage(error) };
        return false;
      }
    },
    submitDraft(id: number): boolean {
      try {
        const snapshot = approvalController.submitDraft(id);
        this.documents = approvalController.listDocuments();
        this.selectedId = snapshot.id;
        this.feedback = {
          type: "success",
          message: `已送审，形成只读快照 #${snapshot.snapshot_seq}（${snapshot.submitted_at ?? ""}）`
        };
        return true;
      } catch (error) {
        this.feedback = { type: "error", message: this.toMessage(error) };
        return false;
      }
    },
    signClause(payload: {
      documentId: number;
      sectionId: number;
      role: "LEGAL" | "BUSINESS";
      signerName: string;
    }): boolean {
      try {
        const doc = approvalController.signClause(payload);
        this.documents = approvalController.listDocuments();
        this.selectedId = doc.id;
        this.feedback = { type: "success", message: "签署成功" };
        return true;
      } catch (error) {
        this.feedback = { type: "error", message: this.toMessage(error) };
        return false;
      }
    },
    isHistorical(doc: ApprovalPolicyDocument): boolean {
      try {
        return approvalController.isHistoricalSnapshot(doc);
      } catch {
        return false;
      }
    },
    toMessage(error: unknown): string {
      if (error instanceof ApprovalControllerError) return error.message;
      return "操作失败，请重试";
    }
  }
});
