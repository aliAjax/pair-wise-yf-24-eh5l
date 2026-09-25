import type { ClauseSignature } from "../types/ClauseSignature";
import type { SignatureRole } from "../constants/SignatureRole";

const now = () => new Date().toISOString();

export const createDefaultClauseSignature = (overrides: Partial<ClauseSignature> = {}): ClauseSignature => ({
  id: 1 as never,
  clause_id: 1 as never,
  version_id: 1 as never,
  role: "LEGAL" as SignatureRole,
  signer: "signer 1" as never,
  signed_at: now() as never,
  content_fingerprint: "" as never,
  ...overrides
});

export const createClauseSignatureForm = createDefaultClauseSignature;
export const createClauseSignatureResponse = createDefaultClauseSignature;
