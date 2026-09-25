import type { ApprovalPolicyDocument } from "../types/ApprovalPolicyDocument";

/**
 * 审批模块本机演示种子：一份已送审快照（含部分签名）+ 一份同版待提交草稿，
 * 用于首次打开时演示“草稿覆盖 / 送审快照 / 双角色会签 / 历史回看”。
 */
export const approvalSeedDocuments: ApprovalPolicyDocument[] = [
  {
    id: 2,
    doc_key: "隐私政策__v2.0",
    title: "隐私政策",
    version_label: "v2.0",
    raw_text: "第一条 总则\n我们收集您的账号注册信息，包括手机号与设备标识，用于创建账户与安全风控。\n第二条 信息共享\n我们可能将您的个人信息共享给第三方支付与广告合作方，范围以您授权为限。",
    lifecycle: "DRAFT",
    imported_at: "2026-09-23T02:00:00.000Z",
    updated_at: "2026-09-23T02:00:00.000Z",
    submitted_at: null,
    snapshot_seq: 0,
    sections: [
      {
        id: 201,
        document_id: 2,
        section_no: "第一条",
        heading: "总则",
        content: "我们收集您的账号注册信息，包括手机号与设备标识，用于创建账户与安全风控。",
        risk_level: "HIGH",
        signatures: []
      },
      {
        id: 202,
        document_id: 2,
        section_no: "第二条",
        heading: "信息共享",
        content: "我们可能将您的个人信息共享给第三方支付与广告合作方，范围以您授权为限。",
        risk_level: "CRITICAL",
        signatures: []
      }
    ]
  },
  {
    id: 1,
    doc_key: "隐私政策__v2.0",
    title: "隐私政策",
    version_label: "v2.0",
    raw_text: "第一条 总则\n我们收集您的账号注册信息。",
    lifecycle: "SUBMITTED",
    imported_at: "2026-09-20T09:00:00.000Z",
    updated_at: "2026-09-21T03:00:00.000Z",
    submitted_at: "2026-09-21T03:00:00.000Z",
    snapshot_seq: 1,
    sections: [
      {
        id: 101,
        document_id: 1,
        section_no: "第一条",
        heading: "总则",
        content: "我们收集您的账号注册信息，包括手机号与设备标识。",
        risk_level: "HIGH",
        signatures: [
          {
            id: 1001,
            section_id: 101,
            role: "LEGAL",
            signer_name: "张法务",
            signed_at: "2026-09-21T05:00:00.000Z",
            carried_from: null
          }
        ]
      },
      {
        id: 102,
        document_id: 1,
        section_no: "第二条",
        heading: "信息共享",
        content: "我们可能将信息共享给第三方支付与广告合作方。",
        risk_level: "CRITICAL",
        signatures: [
          {
            id: 1002,
            section_id: 102,
            role: "LEGAL",
            signer_name: "张法务",
            signed_at: "2026-09-21T05:10:00.000Z",
            carried_from: null
          },
          {
            id: 1003,
            section_id: 102,
            role: "BUSINESS",
            signer_name: "李业务",
            signed_at: "2026-09-21T06:00:00.000Z",
            carried_from: null
          }
        ]
      }
    ]
  }
];

export const approvalSeedSequences = {
  document: 2,
  section: 202,
  signature: 1003,
  snapshotByKey: { "隐私政策__v2.0": 1 }
};
