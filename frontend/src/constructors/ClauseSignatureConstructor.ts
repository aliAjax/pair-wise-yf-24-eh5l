import type { ClauseSignature } from "../types/ClauseSignature";
import type { SignRole } from "../types/SignRole";

export const createDefaultClauseSignature = (
  overrides: Partial<ClauseSignature> = {}
): ClauseSignature => ({
  id: 0,
  section_id: 0,
  role: "LEGAL",
  signer_name: "",
  signed_at: new Date("2026-09-25T09:00:00Z").toISOString(),
  carried_from: null,
  ...overrides
});

export const createClauseSignatureForm = createDefaultClauseSignature;
export const createClauseSignatureResponse = createDefaultClauseSignature;

export const createClauseSignatureFromInput = (params: {
  id: number;
  sectionId: number;
  role: SignRole;
  signerName: string;
  now: string;
}): ClauseSignature =>
  createDefaultClauseSignature({
    id: params.id,
    section_id: params.sectionId,
    role: params.role,
    signer_name: params.signerName.trim(),
    signed_at: params.now,
    carried_from: null
  });
