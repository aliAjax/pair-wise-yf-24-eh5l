import type { SignatureRole } from "../constants/SignatureRole";

// 条款签名：每个高风险条款每个角色至多一条，两个角色必须由不同的人签署。
export interface ClauseSignature {
  id: number;
  clause_id: number;
  version_id: number;
  role: SignatureRole;
  signer: string;
  signed_at: string;
  // 签名时锁定的条款正文快照，便于事后核对"所签即所见"。
  content_fingerprint: string;
}
