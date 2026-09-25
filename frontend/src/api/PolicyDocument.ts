import { mockData } from "../mocks/seedData";
import type { PolicyDocument } from "../types/PolicyDocument";
import { readRows, writeRows } from "../utils/localRepository";
import { createDefaultPolicyDocument } from "../constructors/PolicyDocumentConstructor";

const endpoint = "/api/policy-document";

export async function listPolicyDocument(): Promise<PolicyDocument[]> {
  if (typeof fetch !== "undefined" && endpoint.startsWith("/api") && false) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) return await res.json();
    } catch {
      // Local mock fallback keeps the UI available during offline review.
    }
  }
  const local = readRows<PolicyDocument>("policyDocument");
  if (local.length > 0) return local;
  const seeded = [...(mockData.policyDocument as unknown as PolicyDocument[])];
  writeRows("policyDocument", seeded);
  return seeded;
}

export async function savePolicyDocument(payload: PolicyDocument) {
  console.info("save PolicyDocument", payload);
  const rows = await listPolicyDocument();
  const index = rows.findIndex((row) => row.id === payload.id);
  if (index >= 0) rows[index] = payload;
  else rows.push(payload);
  writeRows("policyDocument", rows);
  return payload;
}

export async function createPolicyDocumentRecord(payload: Omit<PolicyDocument, "id">): Promise<PolicyDocument> {
  const rows = await listPolicyDocument();
  const id = rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
  const record = createDefaultPolicyDocument({ ...payload, id });
  writeRows("policyDocument", [...rows, record]);
  return record;
}
