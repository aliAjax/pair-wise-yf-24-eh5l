import type { SignRole } from "./SignRole";

/**
 * 条款签名：每个高风险条款需两类角色各签一次。
 * 同一自然人不能同时顶两个角色（同一条款内 signer_name 不得重复）。
 */
export interface ClauseSignature {
  id: number;
  section_id: number;
  role: SignRole;
  signer_name: string;
  signed_at: string;
  /** 上一版该条款正文无非排版变化时沿用旧签名，记录来源条款 id；新签名为 null */
  carried_from: number | null;
}
