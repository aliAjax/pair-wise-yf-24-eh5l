import { defineStore } from "pinia";
import type { ApprovalVersion } from "../types/ApprovalVersion";
import type { ApprovalClause } from "../types/ApprovalClause";
import type { ClauseSignature } from "../types/ClauseSignature";
import type { ApprovalSnapshot } from "../types/ApprovalSnapshot";
import type { ApprovalAuditLog } from "../types/ApprovalAuditLog";
import type { SignatureRole } from "../constants/SignatureRole";
import { listApprovalVersion } from "../api/ApprovalVersion";
import { listApprovalClause } from "../api/ApprovalClause";
import { listClauseSignature } from "../api/ClauseSignature";
import { listApprovalSnapshot } from "../api/ApprovalSnapshot";
import { listAuditLogs } from "../utils/auditTrail";
import { importNewVersion, submitVersion, signClause, updateClause } from "../services/approvalWorkflow";
import { signaturesOfClause, missingRoles, isVersionFullySigned } from "../utils/signatureRules";

interface ImportPayload {
  title: string;
  version_label: string;
  raw_text: string;
}

// Controller 层：页面只调用 store，业务校验在 service 抛 ApprovalServiceError，
// store 统一转成 lastError 供页面展示，不吞掉错误码。
export const useApprovalStore = defineStore("approval", {
  state: () => ({
    versions: [] as ApprovalVersion[],
    clauses: [] as ApprovalClause[],
    signatures: [] as ClauseSignature[],
    snapshots: [] as ApprovalSnapshot[],
    auditLogs: [] as ApprovalAuditLog[],
    loading: false,
    lastError: "",
    lastMessage: ""
  }),
  getters: {
    clausesOfVersion: (state) => (versionId: number) =>
      state.clauses
        .filter((clause) => clause.version_id === versionId)
        .sort((a, b) => a.section_no.localeCompare(b.section_no, "zh-CN", { numeric: true })),
    signaturesOfVersion: (state) => (versionId: number) =>
      state.signatures.filter((signature) => signature.version_id === versionId),
    snapshotsOfVersion: (state) => (versionId: number) =>
      state.snapshots
        .filter((snapshot) => snapshot.version_id === versionId)
        .sort((a, b) => a.round - b.round),
    signaturesForClause: (state) => (clauseId: number) => signaturesOfClause(clauseId, state.signatures),
    missingRolesForClause: (state) => (clauseId: number) =>
      missingRoles(signaturesOfClause(clauseId, state.signatures)),
    isVersionComplete: (state) => (versionId: number) =>
      isVersionFullySigned(
        state.clauses.filter((clause) => clause.version_id === versionId),
        state.signatures.filter((signature) => signature.version_id === versionId)
      )
  },
  actions: {
    async load() {
      this.loading = true;
      try {
        const [versions, clauses, signatures, snapshots, auditLogs] = await Promise.all([
          listApprovalVersion(),
          listApprovalClause(),
          listClauseSignature(),
          listApprovalSnapshot(),
          Promise.resolve(listAuditLogs())
        ]);
        this.versions = versions;
        this.clauses = clauses;
        this.signatures = signatures;
        this.snapshots = snapshots;
        this.auditLogs = auditLogs;
      } finally {
        this.loading = false;
      }
    },
    async importVersion(payload: ImportPayload, operator: string) {
      this.lastError = "";
      this.lastMessage = "";
      try {
        const result = await importNewVersion(payload, operator);
        await this.load();
        this.lastMessage = result.draftExisted
          ? result.changedSectionNos.length > 0
            ? `已覆盖工作副本，第 ${result.changedSectionNos.join("、")} 条正文非排版变化，已回到待签`
            : "已覆盖本机草稿，未产生新快照"
          : "草稿已保存在本机，送审前可反复编辑覆盖";
        return result;
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : String(error);
        return null;
      }
    },
    async submit(versionId: number, operator: string) {
      this.lastError = "";
      this.lastMessage = "";
      try {
        const snapshot = await submitVersion(versionId, operator);
        await this.load();
        this.lastMessage = `已送审并冻结第 ${snapshot.round} 轮只读快照`;
        return snapshot;
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : String(error);
        return null;
      }
    },
    async sign(versionId: number, clauseId: number, role: SignatureRole, signer: string, operator: string) {
      this.lastError = "";
      this.lastMessage = "";
      try {
        await signClause(clauseId, role, signer, operator);
        await this.load();
        const complete = this.isVersionComplete(versionId);
        this.lastMessage = complete ? "两类角色已签齐，该高风险条款会签完成；全部条款已齐，版本会签完成" : "签名已封存进当前送审快照";
        return complete;
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : String(error);
        return null;
      }
    },
    async editClause(clauseId: number, patch: { heading?: string; content?: string; category?: string }, operator: string) {
      this.lastError = "";
      this.lastMessage = "";
      try {
        await updateClause(clauseId, patch, operator);
        await this.load();
        this.lastMessage = "条款已保存；若正文非排版变化，该条款已回到待签";
        return true;
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : String(error);
        return false;
      }
    },
    clearFeedback() {
      this.lastError = "";
      this.lastMessage = "";
    }
  }
});
