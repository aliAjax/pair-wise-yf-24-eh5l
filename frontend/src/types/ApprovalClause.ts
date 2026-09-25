// 审批版本下的条款（工作副本）。以 version_id + section_no 定位同一条款，
// 用于判断"同一新版"反复导入 / 修订时正文是否发生非排版变化。
export interface ApprovalClause {
  id: number;
  version_id: number;
  section_no: string;
  heading: string;
  content: string;
  category: string;
  // 高风险条款（HIGH / CRITICAL）需要法务与业务各签一次。
  risk_level: string;
  requires_signature: boolean;
  // 最近一次发生非排版正文变化的时间；仅用于界面展示"回到待签"的原因。
  body_changed_at: string | null;
  updated_at: string;
}
