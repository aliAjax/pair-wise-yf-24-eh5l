import type { DocumentLifecycle } from "./DocumentLifecycle";
import type { ApprovalPolicySection } from "./ApprovalPolicySection";

/**
 * 审批工作流用政策文档：
 * - DRAFT 草稿留在本机反复编辑，同一份新版（标题+版本号）重复导入只覆盖草稿
 * - SUBMITTED 送审后形成只读快照，正文与签名均冻结，历史快照可回看不可再改
 */
export interface ApprovalPolicyDocument {
  id: number;
  /** 同一新版的业务标识：标题 + 版本号，草稿按它去重覆盖 */
  doc_key: string;
  title: string;
  version_label: string;
  raw_text: string;
  lifecycle: DocumentLifecycle;
  imported_at: string;
  /** 最近一次导入/编辑时间（草稿反复覆盖时刷新） */
  updated_at: string;
  /** 送审时间，即快照形成时间；草稿为 null */
  submitted_at: string | null;
  /** 快照序号：同一 doc_key 每次送审递增 1 */
  snapshot_seq: number;
  /** 送审后不可变的条款正文 */
  sections: ApprovalPolicySection[];
}
