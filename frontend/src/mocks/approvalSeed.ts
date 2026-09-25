import { readRows, writeRows } from "../utils/localRepository";
import { createDefaultPolicyDocument } from "../constructors/PolicyDocumentConstructor";
import { createDefaultPolicySection } from "../constructors/PolicySectionConstructor";
import { createDefaultApprovalVersion } from "../constructors/ApprovalVersionConstructor";
import { createDefaultApprovalClause, isHighRiskLevel } from "../constructors/ApprovalClauseConstructor";
import { createFrozenSnapshot } from "../constructors/ApprovalSnapshotConstructor";
import { parsePolicyText } from "../hooks/usePolicyParser";
import { appendAuditLog } from "../utils/auditTrail";
import type { PolicyDocument } from "../types/PolicyDocument";
import type { PolicySection } from "../types/PolicySection";
import type { ApprovalVersion } from "../types/ApprovalVersion";
import type { ApprovalClause } from "../types/ApprovalClause";
import type { ApprovalSnapshot } from "../types/ApprovalSnapshot";

const SEED_MARKER = "policy-diff:seeded:approval-v1";

const SEED_RAW = `一、适用范围与更新日期
本政策说明个人信息处理规则，更新日期为2026年9月25日。

二、我们如何收集个人信息
注册与使用服务时，我们会收集手机号、位置信息，并在你授权后采集相册、麦克风与通讯录信息。

三、第三方共享与委托处理
为完成支付与物流，我们会向合作伙伴共享必要的个人信息，并通过 SDK 委托处理设备标识。

四、数据跨境出境
部分功能需向境外接收方提供个人信息，出境前将另行取得你的单独同意。

五、保存期限与删除
我们仅在最短必要期限内留存个人信息，期限届满后删除或匿名化。

六、你的权利
你可以查阅、复制、更正、删除个人信息，撤回同意，注销账户并进行投诉。`;

// 首次进入时种入一条"草稿"（未送审），用户可立刻体验：反复导入只覆盖草稿、送审、双签。
export function ensureApprovalSeed(): void {
  try {
    if (localStorage.getItem(SEED_MARKER)) return;

    const parsed = parsePolicyText(SEED_RAW);
    const timestamp = "2026-09-25T01:30:00.000Z";

    const documentRecord = createDefaultPolicyDocument({
      id: 9001,
      title: "隐私政策（新版）",
      version_label: "v2026.09",
      raw_text: SEED_RAW,
      normalized_sections: JSON.stringify(parsed.map((section) => section.section_no)),
      imported_at: timestamp
    });

    const existingDocs = readRows<PolicyDocument>("policyDocument").filter((row) => row.id !== documentRecord.id);
    writeRows("policyDocument", [...existingDocs, documentRecord]);

    const sections: PolicySection[] = parsed.map((section, index) =>
      createDefaultPolicySection({
        id: 9100 + index,
        document_id: documentRecord.id,
        section_no: section.section_no,
        heading: section.heading,
        content: section.content,
        category: section.category,
        risk_level: section.risk_level
      })
    );
    const existingSections = readRows<PolicySection>("policySection").filter(
      (row) => row.document_id !== documentRecord.id
    );
    writeRows("policySection", [...existingSections, ...sections]);

    const draftVersion: ApprovalVersion = createDefaultApprovalVersion({
      id: 9001,
      title: "隐私政策（新版）",
      version_label: "v2026.09",
      phase: "DRAFT",
      source_document_id: documentRecord.id,
      submission_round: 0,
      submitted_at: null,
      completed_at: null,
      created_at: timestamp,
      updated_at: timestamp
    });
    const versions = [...readRows<ApprovalVersion>("approvalVersion").filter((row) => row.id !== 9001), draftVersion];
    writeRows("approvalVersion", versions);

    const draftClauses: ApprovalClause[] = parsed.map((section, index) =>
      createDefaultApprovalClause({
        id: 9200 + index,
        version_id: draftVersion.id,
        section_no: section.section_no,
        heading: section.heading,
        content: section.content,
        category: section.category,
        risk_level: section.risk_level,
        requires_signature: isHighRiskLevel(section.risk_level),
        body_changed_at: null,
        updated_at: timestamp
      })
    );
    writeRows("approvalClause", draftClauses);

    // 额外种入一条历史已完成版本及其只读快照，演示"历史快照可回看、不能再改"。
    const completedDoc = createDefaultPolicyDocument({
      id: 9002,
      title: "隐私政策（上一版）",
      version_label: "v2026.03",
      raw_text: SEED_RAW,
      normalized_sections: "[]",
      imported_at: "2026-03-02T01:30:00.000Z"
    });
    writeRows("policyDocument", [...readRows<PolicyDocument>("policyDocument"), completedDoc]);

    const completedVersion: ApprovalVersion = createDefaultApprovalVersion({
      id: 9002,
      title: "隐私政策（上一版）",
      version_label: "v2026.03",
      phase: "COMPLETED",
      source_document_id: completedDoc.id,
      submission_round: 1,
      submitted_at: "2026-03-02T02:00:00.000Z",
      completed_at: "2026-03-03T08:00:00.000Z",
      created_at: "2026-03-01T01:30:00.000Z",
      updated_at: "2026-03-03T08:00:00.000Z"
    });
    writeRows("approvalVersion", [...readRows<ApprovalVersion>("approvalVersion"), completedVersion]);

    const completedClauses: ApprovalClause[] = parsed.map((section, index) =>
      createDefaultApprovalClause({
        id: 9300 + index,
        version_id: completedVersion.id,
        section_no: section.section_no,
        heading: section.heading,
        content: section.content,
        category: section.category,
        risk_level: section.risk_level,
        requires_signature: isHighRiskLevel(section.risk_level),
        body_changed_at: null,
        updated_at: "2026-03-03T08:00:00.000Z"
      })
    );
    writeRows("approvalClause", [...readRows<ApprovalClause>("approvalClause"), ...completedClauses]);

    // 历史快照中的签名直接内联封存（仅用于只读回看，不进入当前签名表）。
    const legalSnapshot = createFrozenSnapshot(
      { ...completedVersion, phase: "SUBMITTED" },
      completedClauses,
      [],
      { id: 9001, round: 1, frozen_at: "2026-03-02T02:00:00.000Z" }
    );
    const sealedSnapshot: ApprovalSnapshot = {
      ...legalSnapshot,
      clauses: legalSnapshot.clauses.map((clause) =>
        clause.requires_signature
          ? {
              ...clause,
              signatures: [
                { role: "LEGAL", signer: "李法务", signed_at: "2026-03-02T05:20:00.000Z", content_fingerprint: "seed" },
                { role: "BUSINESS", signer: "王业务", signed_at: "2026-03-03T08:00:00.000Z", content_fingerprint: "seed" }
              ]
            }
          : clause
      )
    };
    writeRows("approvalSnapshot", [...readRows<ApprovalSnapshot>("approvalSnapshot"), sealedSnapshot]);

    appendAuditLog("审批版本创建（草稿留在本机）", "种子数据：新版草稿已留在本机，等待送审", "system", { version_id: draftVersion.id });

    localStorage.setItem(SEED_MARKER, new Date().toISOString());
  } catch (error) {
    console.warn("seed approval data failed", error);
  }
}
