import type { ApprovalPolicyDocument } from "../types/ApprovalPolicyDocument";
import type { ApprovalPolicySection } from "../types/ApprovalPolicySection";
import { STORAGE_KEYS } from "../api/storageKeys";
import { readStorage, writeStorage } from "../api/storage";
import { appendLog } from "../api/auditLog";
import { LOG_TEMPLATES } from "../constants/logTemplates";
import { ERROR_CODES } from "../constants/errorCodes";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import { isHighRisk } from "../constants/riskPolicy";
import {
  buildDocKey,
  createDocumentFromDraftInput,
  createSubmittedSnapshot
} from "../constructors/ApprovalPolicyDocumentConstructor";
import { createApprovalPolicySectionFromDraft } from "../constructors/ApprovalPolicySectionConstructor";
import { createClauseSignatureFromInput } from "../constructors/ClauseSignatureConstructor";
import { buildSectionsFromDrafts, parseSectionsFromText } from "../utils/policyContent";

/** 业务异常（service 层抛出，controller 层包装） */
export class ApprovalServiceError extends Error {
  code: keyof typeof ERROR_CODES;
  constructor(code: keyof typeof ERROR_CODES) {
    super(ERROR_MESSAGES[code]);
    this.code = code;
    this.name = "ApprovalServiceError";
  }
}

interface Sequences {
  document: number;
  section: number;
  signature: number;
  snapshotByKey: Record<string, number>;
}

const DEFAULT_SEQUENCES: Sequences = { document: 0, section: 0, signature: 0, snapshotByKey: {} };

const loadDocuments = (): ApprovalPolicyDocument[] =>
  readStorage<ApprovalPolicyDocument[]>(STORAGE_KEYS.approvalDocuments, []);

const saveDocuments = (rows: ApprovalPolicyDocument[]): void =>
  writeStorage(STORAGE_KEYS.approvalDocuments, rows);

const loadSequences = (): Sequences =>
  ({ ...DEFAULT_SEQUENCES, ...readStorage<Partial<Sequences>>(STORAGE_KEYS.approvalSequences, {}) });

const saveSequences = (sequences: Sequences): void =>
  writeStorage(STORAGE_KEYS.approvalSequences, sequences);

const findIndex = (rows: ApprovalPolicyDocument[], id: number): number =>
  rows.findIndex((item) => item.id === id);

const assertWritable = (document: ApprovalPolicyDocument): void => {
  if (document.lifecycle === "SUBMITTED") {
    throw new ApprovalServiceError("SNAPSHOT_READONLY");
  }
};

/** 某快照是否为当前版本之前的历史快照（可回看，不能签名/修改） */
export const isHistoricalSnapshot = (document: ApprovalPolicyDocument, rows: ApprovalPolicyDocument[]): boolean => {
  if (document.lifecycle !== "SUBMITTED") return false;
  return rows.some(
    (item) =>
      item.doc_key === document.doc_key &&
      (item.lifecycle === "DRAFT" || item.snapshot_seq > document.snapshot_seq)
  );
};

export interface ImportDraftInput {
  title: string;
  versionLabel: string;
  rawText: string;
}

export interface ImportDraftResult {
  document: ApprovalPolicyDocument;
  /** true = 同版草稿已存在，本次导入只覆盖草稿 */
  overwritten: boolean;
  resetSectionNos: string[];
}

/**
 * 导入同一份新版：
 * - 未送审前按 doc_key 找到草稿则反复覆盖草稿，不新增文档
 * - 送审后（只剩快照或又产生新草稿）导入则形成新的草稿
 */
export const importDraft = (input: ImportDraftInput): ImportDraftResult => {
  const title = input.title.trim();
  const versionLabel = input.versionLabel.trim();
  const rawText = input.rawText;
  if (!title || !versionLabel || !rawText.trim()) {
    throw new ApprovalServiceError("VALIDATION_FAILED");
  }

  const rows = loadDocuments();
  const sequences = loadSequences();
  const docKey = buildDocKey(title, versionLabel);
  const now = new Date().toISOString();
  const drafts = parseSectionsFromText(rawText);

  const existingIndex = rows.findIndex(
    (item) => item.doc_key === docKey && item.lifecycle === "DRAFT"
  );

  /**
   * 签名继承基线：
   * - 未送审反复导入 => 基线为当前草稿
   * - 已有送审快照后再导入新版草稿 => 基线为同 doc_key 最新一份快照，
   *   未发生非排版变化的条款结论继续有效，沿用上一版签名
   */
  const latestSnapshot = rows
    .filter((item) => item.doc_key === docKey && item.lifecycle === "SUBMITTED")
    .sort((a, b) => b.snapshot_seq - a.snapshot_seq)[0];
  const baseline = existingIndex >= 0 ? rows[existingIndex] : latestSnapshot;

  if (existingIndex >= 0 || baseline) {
    const { sections, resetSectionNos } = buildSectionsFromDrafts(
      drafts,
      existingIndex >= 0 ? rows[existingIndex].id : sequences.document + 1,
      baseline ? baseline.sections : [],
      sequences.section,
      sequences.signature
    );
    sequences.section = Math.max(sequences.section, ...sections.map((s) => s.id), sequences.section);
    sequences.signature = Math.max(
      sequences.signature,
      ...sections.flatMap((s) => s.signatures.map((sig) => sig.id)),
      sequences.signature
    );

    if (existingIndex >= 0) {
      const existing = rows[existingIndex];
      const updated: ApprovalPolicyDocument = {
        ...existing,
        title,
        version_label: versionLabel,
        raw_text: rawText,
        sections,
        updated_at: now
      };
      rows[existingIndex] = updated;
      saveDocuments(rows);
      saveSequences(sequences);
      appendLog(
        LOG_TEMPLATES.ApprovalPolicyDocument[1],
        `草稿覆盖：${title} ${versionLabel}；实质变化回签条款：${resetSectionNos.join("、") || "无"}`,
        now
      );
      if (resetSectionNos.length > 0) {
        appendLog(
          LOG_TEMPLATES.ClauseSignature[1],
          `${title} ${versionLabel} 条款 ${resetSectionNos.join("、")} 正文非排版变化，签名已清除回到待签`,
          now
        );
      }
      return { document: updated, overwritten: true, resetSectionNos };
    }

    sequences.document += 1;
    const documentId = sequences.document;
    const rebasedSections = sections.map((section) => ({ ...section, document_id: documentId }));
    const document = createDocumentFromDraftInput({
      id: documentId,
      title,
      versionLabel,
      rawText,
      sections: rebasedSections,
      now
    });
    rows.unshift(document);
    saveDocuments(rows);
    saveSequences(sequences);
    appendLog(
      LOG_TEMPLATES.ApprovalPolicyDocument[0],
      `基于最新快照#${latestSnapshot!.snapshot_seq} 新建草稿：${title} ${versionLabel}；实质变化回签条款：${resetSectionNos.join("、") || "无"}`,
      now
    );
    if (resetSectionNos.length > 0) {
      appendLog(
        LOG_TEMPLATES.ClauseSignature[1],
        `${title} ${versionLabel} 条款 ${resetSectionNos.join("、")} 正文非排版变化，签名已清除回到待签`,
        now
      );
    }
    return { document, overwritten: false, resetSectionNos };
  }

  sequences.document += 1;
  const documentId = sequences.document;
  const sections: ApprovalPolicySection[] = [];
  for (const draft of drafts) {
    sequences.section += 1;
    sections.push(createApprovalPolicySectionFromDraft(draft, sequences.section, documentId));
  }
  const document = createDocumentFromDraftInput({
    id: documentId,
    title,
    versionLabel,
    rawText,
    sections,
    now
  });
  rows.unshift(document);
  saveDocuments(rows);
  saveSequences(sequences);
  appendLog(LOG_TEMPLATES.ApprovalPolicyDocument[0], `新版草稿导入：${title} ${versionLabel}`, now);
  return { document, overwritten: false, resetSectionNos: [] };
};

/** 草稿正文编辑保存：仅覆盖草稿（同 importDraft 的覆盖语义，入口不同便于审计） */
export const updateDraftContent = (id: number, rawText: string): ApprovalPolicyDocument => {
  if (!rawText.trim()) throw new ApprovalServiceError("VALIDATION_FAILED");
  const rows = loadDocuments();
  const index = findIndex(rows, id);
  if (index < 0) throw new ApprovalServiceError("VALIDATION_FAILED");
  const document = rows[index];
  assertWritable(document);

  const sequences = loadSequences();
  const now = new Date().toISOString();
  const { sections, resetSectionNos } = buildSectionsFromDrafts(
    parseSectionsFromText(rawText),
    document.id,
    document.sections,
    sequences.section,
    sequences.signature
  );
  sequences.section = Math.max(sequences.section, ...sections.map((s) => s.id));
  sequences.signature = Math.max(
    sequences.signature,
    ...sections.flatMap((s) => s.signatures.map((sig) => sig.id))
  );

  const updated: ApprovalPolicyDocument = { ...document, raw_text: rawText, sections, updated_at: now };
  rows[index] = updated;
  saveDocuments(rows);
  saveSequences(sequences);
  appendLog(
    LOG_TEMPLATES.ApprovalPolicyDocument[1],
    `草稿编辑覆盖：${document.title} ${document.version_label}；实质变化回签条款：${resetSectionNos.join("、") || "无"}`,
    now
  );
  if (resetSectionNos.length > 0) {
    appendLog(
      LOG_TEMPLATES.ClauseSignature[1],
      `${document.title} ${document.version_label} 条款 ${resetSectionNos.join("、")} 签名已清除`,
      now
    );
  }
  return updated;
};

/** 送审：草稿转为只读快照；同一 doc_key 快照序号递增，草稿不再保留 */
export const submitDraft = (id: number): ApprovalPolicyDocument => {
  const rows = loadDocuments();
  const index = findIndex(rows, id);
  if (index < 0) throw new ApprovalServiceError("VALIDATION_FAILED");
  const draft = rows[index];
  assertWritable(draft);

  const sequences = loadSequences();
  const nextSeq = (sequences.snapshotByKey[draft.doc_key] ?? 0) + 1;
  sequences.snapshotByKey[draft.doc_key] = nextSeq;
  const now = new Date().toISOString();
  const snapshot = createSubmittedSnapshot(draft, nextSeq, now);
  rows[index] = snapshot;
  saveDocuments(rows);
  saveSequences(sequences);
  appendLog(
    LOG_TEMPLATES.ApprovalPolicyDocument[2],
    `送审生成只读快照 #${nextSeq}：${snapshot.title} ${snapshot.version_label}`,
    now
  );
  return snapshot;
};

export interface SignClauseInput {
  documentId: number;
  sectionId: number;
  role: ApprovalPolicySection["signatures"][number]["role"];
  signerName: string;
}

/** 条款签署：仅高风险条款；每角色一次；同一人不能顶两个角色 */
export const signClause = (input: SignClauseInput): ApprovalPolicyDocument => {
  const signerName = input.signerName.trim();
  if (!signerName) throw new ApprovalServiceError("VALIDATION_FAILED");

  const rows = loadDocuments();
  const index = findIndex(rows, input.documentId);
  if (index < 0) throw new ApprovalServiceError("VALIDATION_FAILED");
  const document = rows[index];
  if (document.lifecycle !== "SUBMITTED") throw new ApprovalServiceError("RBAC_DENIED");
  if (isHistoricalSnapshot(document, rows)) {
    throw new ApprovalServiceError("HISTORICAL_SNAPSHOT_LOCKED");
  }
  const section = document.sections.find((item) => item.id === input.sectionId);
  if (!section) throw new ApprovalServiceError("VALIDATION_FAILED");
  if (!isHighRisk(section.risk_level)) throw new ApprovalServiceError("NON_HIGH_RISK_NO_SIGNATURE");
  if (section.signatures.some((item) => item.role === input.role)) {
    throw new ApprovalServiceError("ROLE_ALREADY_SIGNED");
  }
  if (section.signatures.some((item) => item.signer_name === signerName)) {
    throw new ApprovalServiceError("SIGNER_ROLE_CONFLICT");
  }

  const sequences = loadSequences();
  sequences.signature += 1;
  const now = new Date().toISOString();
  const signature = createClauseSignatureFromInput({
    id: sequences.signature,
    sectionId: section.id,
    role: input.role,
    signerName,
    now
  });
  const updatedSections = document.sections.map((item) =>
    item.id === section.id ? { ...item, signatures: [...item.signatures, signature] } : item
  );
  const updated: ApprovalPolicyDocument = { ...document, sections: updatedSections, updated_at: now };
  rows[index] = updated;
  saveDocuments(rows);
  saveSequences(sequences);
  appendLog(
    LOG_TEMPLATES.ClauseSignature[0],
    `${document.title} 快照#${document.snapshot_seq} 条款 ${section.section_no} ${input.role} 签署：${signerName}`,
    now
  );
  return updated;
};

export const listApprovalDocuments = (): ApprovalPolicyDocument[] => loadDocuments();

export const getApprovalDocument = (id: number): ApprovalPolicyDocument | undefined =>
  loadDocuments().find((item) => item.id === id);

export const resetAll = (): void => {
  saveDocuments([]);
  saveSequences(DEFAULT_SEQUENCES);
};
