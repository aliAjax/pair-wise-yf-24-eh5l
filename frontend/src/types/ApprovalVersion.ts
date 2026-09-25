import type { VersionPhase } from "../constants/VersionPhase";

// 审批工作版本（草稿 / 送审稿）。同一新版未送审前反复导入或编辑，只覆盖同一条草稿；
// 每次送审会冻结出只读的 ApprovalSnapshot，工作版本继续承接后续修订。
export interface ApprovalVersion {
  id: number;
  // 新版导入时的"同一份新版"匹配键：标题 + 版本号。
  title: string;
  version_label: string;
  phase: VersionPhase;
  source_document_id: number | null;
  // 送审轮次：首次送审为 1，送审后修订再送审递增。
  submission_round: number;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}
