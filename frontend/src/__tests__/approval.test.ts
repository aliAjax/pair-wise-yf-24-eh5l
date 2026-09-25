import { describe, expect, test, beforeEach } from "vitest";
import {
  importDraft,
  submitDraft,
  signClause,
  updateDraftContent,
  resetAll,
  isHistoricalSnapshot,
  listApprovalDocuments
} from "../services/ApprovalService";

const POLICY_A = `第一条 总则 [高]
收集手机号与设备标识。
第二条 共享 [严重]
共享给第三方支付合作方。
第三条 联系 [中]
联系邮箱 privacy@example.com。`;

beforeEach(() => {
  localStorage.clear();
  resetAll();
});

describe("草稿与送审快照", () => {
  test("同版重复导入只覆盖草稿，不新增文档", () => {
    const first = importDraft({ title: "隐私政策", versionLabel: "v2.0", rawText: POLICY_A });
    expect(first.overwritten).toBe(false);
    const second = importDraft({ title: "隐私政策", versionLabel: "v2.0", rawText: POLICY_A + "\n" });
    expect(second.overwritten).toBe(true);
    expect(listApprovalDocuments().filter((d) => d.lifecycle === "DRAFT")).toHaveLength(1);
  });

  test("送审后形成只读快照，正文不可再改", () => {
    const draft = importDraft({ title: "隐私政策", versionLabel: "v2.0", rawText: POLICY_A }).document;
    const snap = submitDraft(draft.id);
    expect(snap.lifecycle).toBe("SUBMITTED");
    expect(snap.submitted_at).toBeTruthy();
    expect(snap.snapshot_seq).toBe(1);
    expect(() => updateDraftContent(snap.id, POLICY_A)).toThrow(/只读/);
  });

  test("送审后再次导入同版产生新草稿，送审为 #2，且 #1 成为历史快照", () => {
    const draft = importDraft({ title: "隐私政策", versionLabel: "v2.0", rawText: POLICY_A }).document;
    const snap1 = submitDraft(draft.id);
    const draft2 = importDraft({ title: "隐私政策", versionLabel: "v2.0", rawText: POLICY_A }).document;
    expect(draft2.id).not.toBe(snap1.id);
    const snap2 = submitDraft(draft2.id);
    expect(snap2.snapshot_seq).toBe(2);
    expect(isHistoricalSnapshot(snap1, listApprovalDocuments())).toBe(true);
    expect(isHistoricalSnapshot(snap2, listApprovalDocuments())).toBe(false);
  });
});

describe("签名规则", () => {
  test("高风险条款需法务、业务各签一次，同一人不能顶两个角色", () => {
    const draft = importDraft({ title: "隐私政策", versionLabel: "v2.0", rawText: POLICY_A }).document;
    const snap = submitDraft(draft.id);
    const highSection = snap.sections[0];
    const criticalSection = snap.sections[1];

    signClause({ documentId: snap.id, sectionId: highSection.id, role: "LEGAL", signerName: "张三" });
    expect(() =>
      signClause({ documentId: snap.id, sectionId: highSection.id, role: "LEGAL", signerName: "李四" })
    ).toThrow(/已经签过/);
    expect(() =>
      signClause({ documentId: snap.id, sectionId: highSection.id, role: "BUSINESS", signerName: "张三" })
    ).toThrow(/同一签名人/);
    signClause({ documentId: snap.id, sectionId: highSection.id, role: "BUSINESS", signerName: "李四" });
    // 非高风险条款不能签
    expect(() =>
      signClause({ documentId: snap.id, sectionId: criticalSection ? snap.sections[2].id : 0, role: "LEGAL", signerName: "张三" })
    ).toThrow(/无需会签/);
  });

  test("历史快照不能再签名", () => {
    const draft = importDraft({ title: "隐私政策", versionLabel: "v2.0", rawText: POLICY_A }).document;
    const snap1 = submitDraft(draft.id);
    const draft2 = importDraft({ title: "隐私政策", versionLabel: "v2.0", rawText: POLICY_A }).document;
    submitDraft(draft2.id);
    expect(() =>
      signClause({ documentId: snap1.id, sectionId: snap1.sections[0].id, role: "LEGAL", signerName: "张三" })
    ).toThrow(/历史快照/);
  });
});

describe("正文变化只影响该条款签名", () => {
  const SIGNED_POLICY = `第一条 总则 [高]
收集手机号与设备标识。
第二条 共享 [严重]
共享给第三方支付合作方。`;

  test("仅排版变化沿用签名；非排版变化只清该条款签名", () => {
    const draft = importDraft({ title: "P", versionLabel: "v1", rawText: SIGNED_POLICY }).document;
    let snap = submitDraft(draft.id);
    signClause({ documentId: snap.id, sectionId: snap.sections[0].id, role: "LEGAL", signerName: "张" });
    signClause({ documentId: snap.id, sectionId: snap.sections[0].id, role: "BUSINESS", signerName: "李" });
    signClause({ documentId: snap.id, sectionId: snap.sections[1].id, role: "LEGAL", signerName: "张" });
    signClause({ documentId: snap.id, sectionId: snap.sections[1].id, role: "BUSINESS", signerName: "李" });

    // 新版草稿：第一条实质变化，第二条仅空格/换行变化
    const newText = `第一条 总则 [高]
收集手机号、设备标识与精确位置。
  第二条 共享 [严重]
共享给第三方支付合作方。`;
    const d2 = importDraft({ title: "P", versionLabel: "v1", rawText: newText }).document;
    const snap2 = submitDraft(d2.id);
    const s1 = snap2.sections.find((s) => s.section_no === "第一条")!;
    const s2 = snap2.sections.find((s) => s.section_no === "第二条")!;
    expect(s1.signatures).toHaveLength(0);
    expect(s2.signatures).toHaveLength(2);
    expect(s2.signatures.every((sig) => sig.carried_from !== null)).toBe(true);
  });

  test("低风险条款不需要签名", () => {
    const d = importDraft({
      title: "P",
      versionLabel: "v1",
      rawText: `第一条 联系 [低]
仅提供邮箱联系。`
    }).document;
    const snap = submitDraft(d.id);
    expect(snap.sections[0].signatures).toHaveLength(0);
  });
});
