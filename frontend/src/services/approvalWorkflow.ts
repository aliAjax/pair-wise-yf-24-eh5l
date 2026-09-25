import { ERROR_CODES } from "../constants/errorCodes";
import { LOG_TEMPLATES } from "../constants/logTemplates";
import { ApprovalServiceError } from "../utils/errors";
import { appendAuditLog } from "../utils/auditTrail";
import { isOnlyLayoutChange, contentFingerprint } from "../utils/fingerprint";
import { isVersionFullySigned } from "../utils/signatureRules";
import { nextId } from "../utils/localRepository";
import { createDefaultApprovalVersion } from "../constructors/ApprovalVersionConstructor";
import { createDefaultApprovalClause, isHighRiskLevel } from "../constructors/ApprovalClauseConstructor";
import { createDefaultClauseSignature } from "../constructors/ClauseSignatureConstructor";
import { createFrozenSnapshot } from "../constructors/ApprovalSnapshotConstructor";
import * as ApprovalVersionApi from "../api/ApprovalVersion";
import * as ApprovalClauseApi from "../api/ApprovalClause";
import * as ClauseSignatureApi from "../api/ClauseSignature";
import * as ApprovalSnapshotApi from "../api/ApprovalSnapshot";
import { createPolicyDocumentRecord } from "../api/PolicyDocument";
import { replacePolicySectionsForDocument } from "../api/PolicySection";
import { parsePolicyText } from "../hooks/usePolicyParser";
import type { ApprovalVersion } from "../types/ApprovalVersion";
import type { ApprovalClause } from "../types/ApprovalClause";
import type { ClauseSignature } from "../types/ClauseSignature";
import type { ApprovalSnapshot } from "../types/ApprovalSnapshot";
import type { SignatureRole } from "../constants/SignatureRole";

export interface ImportVersionInput {
  title: string;
  version_label: string;
  raw_text: string;
}

export interface ImportVersionResult {
  version: ApprovalVersion;
  draftExisted: boolean;
  changedSectionNos: string[];
}

const now = () => new Date().toISOString();

async function requireWritableVersion(id: number): Promise<ApprovalVersion> {
  const version = await ApprovalVersionApi.getApprovalVersion(id);
  if (!version) throw new ApprovalServiceError(ERROR_CODES.DRAFT_NOT_FOUND);
  if (version.phase === "COMPLETED") throw new ApprovalServiceError(ERROR_CODES.VERSION_COMPLETED);
  return version;
}

// 导入同一份新版（标题 + 版本号相同）：
// - 未送审（草稿）：反复导入只覆盖本机草稿，不产生快照；
// - 已送审：作为送审后的修订覆盖工作副本，正文非排版变化的条款回到待签；
// - 会签完成：拒绝修改，只能回看快照。
export async function importNewVersion(input: ImportVersionInput, operator: string): Promise<ImportVersionResult> {
  if (!input.title.trim() || !input.version_label.trim() || !input.raw_text.trim()) {
    throw new ApprovalServiceError(ERROR_CODES.VALIDATION_FAILED);
  }

  const parsed = parsePolicyText(input.raw_text);
  const existing = (await ApprovalVersionApi.listApprovalVersion()).find(
    (row) => row.title === input.title.trim() && row.version_label === input.version_label.trim()
  );

  if (existing?.phase === "COMPLETED") {
    throw new ApprovalServiceError(ERROR_CODES.VERSION_COMPLETED);
  }

  // 同一份新版反复导入时复用同一份政策文档，只覆盖其分段，避免产生重复文档。
  const documentId = existing?.source_document_id;
  let documentRecordId: number;
  if (existing && documentId != null) {
    documentRecordId = documentId;
  } else {
    const documentRecord = await createPolicyDocumentRecord({
      title: input.title.trim(),
      version_label: input.version_label.trim(),
      raw_text: input.raw_text,
      normalized_sections: JSON.stringify(parsed.map((section) => section.section_no)),
      imported_at: now()
    });
    documentRecordId = documentRecord.id;
  }
  await replacePolicySectionsForDocument(
    documentRecordId,
    parsed.map((section) => ({
      section_no: section.section_no,
      heading: section.heading,
      content: section.content,
      category: section.category,
      risk_level: section.risk_level
    }))
  );

  if (!existing) {
    const version = createDefaultApprovalVersion({
      id: nextId("approvalVersion"),
      title: input.title.trim(),
      version_label: input.version_label.trim(),
      phase: "DRAFT",
      source_document_id: documentRecordId,
      submission_round: 0,
      created_at: now(),
      updated_at: now()
    });
    await ApprovalVersionApi.writeApprovalVersions([...(await ApprovalVersionApi.listApprovalVersion()), version]);

    const allClauses = await ApprovalClauseApi.listApprovalClause();
    let clauseSeq = allClauses.reduce((max, row) => Math.max(max, row.id), 0);
    const createdClauses: ApprovalClause[] = parsed.map((section) =>
      createDefaultApprovalClause({
        id: (clauseSeq += 1),
        version_id: version.id,
        section_no: section.section_no,
        heading: section.heading,
        content: section.content,
        category: section.category,
        risk_level: section.risk_level,
        requires_signature: isHighRiskLevel(section.risk_level),
        body_changed_at: null,
        updated_at: now()
      })
    );
    await ApprovalClauseApi.writeApprovalClauses([...allClauses, ...createdClauses]);
    appendAuditLog(LOG_TEMPLATES.ApprovalVersion[0], `创建草稿《${version.title}》${version.version_label}`, operator, {
      version_id: version.id
    });
    return { version, draftExisted: false, changedSectionNos: [] };
  }

  // 同一份新版再次导入：只覆盖草稿/工作副本。
  const version: ApprovalVersion = { ...existing, source_document_id: documentRecordId, updated_at: now() };
  const allClauses = await ApprovalClauseApi.listApprovalClause();
  const versionClauses = allClauses.filter((clause) => clause.version_id === version.id);
  const incomingNos = new Set(parsed.map((section) => section.section_no));
  let clauseSeq = allClauses.reduce((max, row) => Math.max(max, row.id), 0);
  let allSignatures = await ClauseSignatureApi.listClauseSignature();
  const changedSectionNos: string[] = [];

  const nextClauses: ApprovalClause[] = parsed.map((section) => {
    const current = versionClauses.find((clause) => clause.section_no === section.section_no);
    const requiresSignature = isHighRiskLevel(section.risk_level);
    if (!current) {
      return createDefaultApprovalClause({
        id: (clauseSeq += 1),
        version_id: version.id,
        section_no: section.section_no,
        heading: section.heading,
        content: section.content,
        category: section.category,
        risk_level: section.risk_level,
        requires_signature: requiresSignature,
        body_changed_at: version.phase === "SUBMITTED" ? now() : null,
        updated_at: now()
      });
    }

    // 仅在已送审阶段、且条款正文发生非排版变化时，清掉该条款已有签名并回到待签。
    const bodyChanged = !isOnlyLayoutChange(current.content, section.content);
    if (version.phase === "SUBMITTED" && bodyChanged) {
      changedSectionNos.push(section.section_no);
      allSignatures = allSignatures.filter((signature) => signature.clause_id !== current.id);
      appendAuditLog(
        LOG_TEMPLATES.ApprovalClause[1],
        `第 ${section.section_no} 条《${section.heading}》正文非排版变化，已清签名回到待签`,
        operator,
        { version_id: version.id, clause_id: current.id }
      );
    } else if (bodyChanged) {
      appendAuditLog(
        LOG_TEMPLATES.ApprovalVersion[1],
        `草稿阶段再次导入，覆盖第 ${section.section_no} 条本机草稿`,
        operator,
        { version_id: version.id, clause_id: current.id }
      );
    } else {
      appendAuditLog(
        LOG_TEMPLATES.ApprovalClause[2],
        `第 ${section.section_no} 条仅排版变化，已有签名继续有效`,
        operator,
        { version_id: version.id, clause_id: current.id }
      );
    }

    return {
      ...current,
      heading: section.heading,
      content: section.content,
      category: section.category,
      risk_level: section.risk_level,
      requires_signature: requiresSignature,
      body_changed_at: version.phase === "SUBMITTED" && bodyChanged ? now() : current.body_changed_at,
      updated_at: now()
    };
  });

  // 本次导入中被删掉的旧条款：连同其签名一并移除（快照里仍保留历史）。
  const removed = versionClauses.filter((clause) => !incomingNos.has(clause.section_no));
  removed.forEach((clause) => {
    allSignatures = allSignatures.filter((signature) => signature.clause_id !== clause.id);
  });

  await ApprovalClauseApi.writeApprovalClauses([
    ...allClauses.filter((clause) => clause.version_id !== version.id),
    ...nextClauses
  ]);
  await ClauseSignatureApi.writeClauseSignatures(allSignatures);
  await ApprovalVersionApi.writeApprovalVersions(
    (await ApprovalVersionApi.listApprovalVersion()).map((row) => (row.id === version.id ? version : row))
  );

  appendAuditLog(
    version.phase === "DRAFT" ? LOG_TEMPLATES.ApprovalVersion[1] : LOG_TEMPLATES.ApprovalVersion[2],
    `同一份新版再次导入，${version.phase === "DRAFT" ? "仅覆盖本机草稿" : "作为送审后修订覆盖工作副本"}：《${version.title}》${version.version_label}`,
    operator,
    { version_id: version.id }
  );

  return { version, draftExisted: true, changedSectionNos };
}

// 逐条编辑条款（审核页内联修改）。
export async function updateClause(
  clauseId: number,
  patch: { heading?: string; content?: string; category?: string },
  operator: string
): Promise<ApprovalClause> {
  const clauses = await ApprovalClauseApi.listApprovalClause();
  const clause = clauses.find((row) => row.id === clauseId);
  if (!clause) throw new ApprovalServiceError(ERROR_CODES.VALIDATION_FAILED);
  const version = await requireWritableVersion(clause.version_id);

  const nextHeading = patch.heading ?? clause.heading;
  const nextContent = patch.content ?? clause.content;
  const nextCategory = patch.category ?? clause.category;
  let signatures = await ClauseSignatureApi.listClauseSignature();
  const bodyChanged = !isOnlyLayoutChange(clause.content, nextContent);

  if (version.phase === "SUBMITTED" && bodyChanged) {
    // 非排版变化：只清掉该条款已有签名，其他条款结论继续有效。
    signatures = signatures.filter((signature) => signature.clause_id !== clause.id);
    await ClauseSignatureApi.writeClauseSignatures(signatures);
    appendAuditLog(
      LOG_TEMPLATES.ApprovalClause[1],
      `第 ${clause.section_no} 条《${clause.heading}》正文非排版变化，已清签名回到待签`,
      operator,
      { version_id: version.id, clause_id: clause.id }
    );
  } else if (bodyChanged) {
    appendAuditLog(LOG_TEMPLATES.ApprovalVersion[2], `草稿编辑覆盖第 ${clause.section_no} 条本机草稿`, operator, {
      version_id: version.id,
      clause_id: clause.id
    });
  } else {
    appendAuditLog(LOG_TEMPLATES.ApprovalClause[2], `第 ${clause.section_no} 条仅排版变化，签名继续有效`, operator, {
      version_id: version.id,
      clause_id: clause.id
    });
  }

  const updated: ApprovalClause = {
    ...clause,
    heading: nextHeading,
    content: nextContent,
    category: nextCategory,
    body_changed_at: version.phase === "SUBMITTED" && bodyChanged ? now() : clause.body_changed_at,
    updated_at: now()
  };
  await ApprovalClauseApi.writeApprovalClauses(clauses.map((row) => (row.id === clauseId ? updated : row)));
  await ApprovalVersionApi.writeApprovalVersions(
    (await ApprovalVersionApi.listApprovalVersion()).map((row) =>
      row.id === version.id ? { ...row, updated_at: now() } : row
    )
  );
  return updated;
}

// 送审：草稿/送审后修订 冻结出新的只读快照。
export async function submitVersion(versionId: number, operator: string): Promise<ApprovalSnapshot> {
  const version = await requireWritableVersion(versionId);
  const clauses = await ApprovalClauseApi.listApprovalClauseByVersion(versionId);
  const signatures = await ClauseSignatureApi.listClauseSignatureByVersion(versionId);

  const snapshots = await ApprovalSnapshotApi.listApprovalSnapshotByVersion(versionId);
  const latest = snapshots[snapshots.length - 1];
  if (version.phase === "SUBMITTED" && latest && new Date(version.updated_at) <= new Date(latest.frozen_at)) {
    throw new ApprovalServiceError(ERROR_CODES.VALIDATION_FAILED);
  }

  const nextRound = version.submission_round + 1;
  const submittedAt = now();
  const updatedVersion: ApprovalVersion = {
    ...version,
    phase: "SUBMITTED",
    submission_round: nextRound,
    submitted_at: version.submitted_at ?? submittedAt,
    updated_at: submittedAt
  };

  const snapshot = createFrozenSnapshot(updatedVersion, clauses, signatures, {
    id: nextId("approvalSnapshot")
  });
  await ApprovalSnapshotApi.appendApprovalSnapshot(snapshot);
  await ApprovalVersionApi.writeApprovalVersions(
    (await ApprovalVersionApi.listApprovalVersion()).map((row) => (row.id === versionId ? updatedVersion : row))
  );

  appendAuditLog(
    LOG_TEMPLATES.ApprovalVersion[3],
    `第 ${nextRound} 轮送审，冻结只读快照（${clauses.length} 条，高风险 ${clauses.filter((c) => c.requires_signature).length} 条）`,
    operator,
    { version_id: versionId }
  );
  return snapshot;
}

// 条款会签：仅送审后可签；高风险条款两类角色各签一次，同一人不能顶两个角色。
export async function signClause(
  clauseId: number,
  role: SignatureRole,
  signer: string,
  operator: string
): Promise<ClauseSignature> {
  const trimmedSigner = signer.trim();
  if (!trimmedSigner) throw new ApprovalServiceError(ERROR_CODES.SIGNER_NAME_REQUIRED);

  const clauses = await ApprovalClauseApi.listApprovalClause();
  const clause = clauses.find((row) => row.id === clauseId);
  if (!clause) throw new ApprovalServiceError(ERROR_CODES.VALIDATION_FAILED);
  const version = await ApprovalVersionApi.getApprovalVersion(clause.version_id);
  if (!version) throw new ApprovalServiceError(ERROR_CODES.DRAFT_NOT_FOUND);
  if (version.phase === "DRAFT") throw new ApprovalServiceError(ERROR_CODES.PHASE_NOT_SUBMITTED);
  if (version.phase === "COMPLETED") throw new ApprovalServiceError(ERROR_CODES.VERSION_COMPLETED);
  if (!clause.requires_signature) throw new ApprovalServiceError(ERROR_CODES.CLAUSE_NOT_HIGH_RISK);

  let signatures = await ClauseSignatureApi.listClauseSignatureByVersion(version.id);
  const clauseSignatures = signatures.filter((signature) => signature.clause_id === clauseId);
  if (clauseSignatures.some((signature) => signature.role === role)) {
    appendAuditLog(LOG_TEMPLATES.ClauseSignature[2], `${role} 角色重复签署第 ${clause.section_no} 条被拒绝`, operator, {
      version_id: version.id,
      clause_id: clauseId
    });
    throw new ApprovalServiceError(ERROR_CODES.ROLE_ALREADY_SIGNED);
  }
  if (clauseSignatures.some((signature) => signature.signer.trim() === trimmedSigner)) {
    appendAuditLog(
      LOG_TEMPLATES.ClauseSignature[3],
      `${trimmedSigner} 试图以 ${role} 身份顶另一角色签署第 ${clause.section_no} 条被拒绝`,
      operator,
      { version_id: version.id, clause_id: clauseId }
    );
    throw new ApprovalServiceError(ERROR_CODES.SIGNER_CONFLICT);
  }

  const created = createDefaultClauseSignature({
    id: nextId("clauseSignature"),
    clause_id: clauseId,
    version_id: version.id,
    role,
    signer: trimmedSigner,
    signed_at: now(),
    content_fingerprint: contentFingerprint(clause.content)
  });
  signatures = [...signatures, created];
  await ClauseSignatureApi.writeClauseSignatures(signatures);
  appendAuditLog(LOG_TEMPLATES.ClauseSignature[0], `${trimmedSigner} 以${role === "LEGAL" ? "法务" : "业务"}身份签署第 ${clause.section_no} 条`, operator, {
    version_id: version.id,
    clause_id: clauseId
  });

  // 把本次签名追加封存进最新一轮快照（历史轮次快照保持只读不动）。
  const allClauses = await ApprovalClauseApi.listApprovalClauseByVersion(version.id);
  const snapshots = await ApprovalSnapshotApi.listApprovalSnapshotByVersion(version.id);
  const latest = snapshots[snapshots.length - 1];
  if (latest) {
    const sealed: ApprovalSnapshot = {
      ...latest,
      clauses: latest.clauses.map((snapshotClause) =>
        snapshotClause.section_no === clause.section_no
          ? {
              ...snapshotClause,
              signatures: [
                ...snapshotClause.signatures,
                {
                  role: created.role,
                  signer: created.signer,
                  signed_at: created.signed_at,
                  content_fingerprint: created.content_fingerprint
                }
              ]
            }
          : snapshotClause
      )
    };
    await ApprovalSnapshotApi.replaceLatestSnapshot(sealed);
  }

  // 任一条款正文非排版变化后只回退该条款；全部高风险条款再签齐时，整体才回到完成。
  if (isVersionFullySigned(allClauses, signatures)) {
    const completedVersion: ApprovalVersion = { ...version, phase: "COMPLETED", completed_at: now(), updated_at: now() };
    await ApprovalVersionApi.writeApprovalVersions(
      (await ApprovalVersionApi.listApprovalVersion()).map((row) => (row.id === version.id ? completedVersion : row))
    );
    appendAuditLog(LOG_TEMPLATES.ApprovalVersion[3], `《${version.title}》全部高风险条款双角色会签完成`, operator, {
      version_id: version.id
    });
  }

  return created;
}
