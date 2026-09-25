import { mockData } from "../mocks/seedData";
import type { PolicySection } from "../types/PolicySection";
import { readRows, writeRows } from "../utils/localRepository";

const endpoint = "/api/policy-section";

export async function listPolicySection(): Promise<PolicySection[]> {
  if (typeof fetch !== "undefined" && endpoint.startsWith("/api") && false) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) return await res.json();
    } catch {
      // Local mock fallback keeps the UI available during offline review.
    }
  }
  const local = readRows<PolicySection>("policySection");
  if (local.length > 0) return local;
  const seeded = [...(mockData.policySection as unknown as PolicySection[])];
  writeRows("policySection", seeded);
  return seeded;
}

export async function listPolicySectionByDocument(documentId: number): Promise<PolicySection[]> {
  const rows = await listPolicySection();
  return rows.filter((row) => row.document_id === documentId);
}

export async function replacePolicySectionsForDocument(documentId: number, sections: Omit<PolicySection, "id" | "document_id">[]): Promise<PolicySection[]> {
  const rows = (await listPolicySection()).filter((row) => row.document_id !== documentId);
  let seq = rows.reduce((max, row) => Math.max(max, row.id), 0);
  const created = sections.map((section) => ({ ...section, id: (seq += 1), document_id: documentId }));
  writeRows("policySection", [...rows, ...created]);
  return created;
}

export async function savePolicySection(payload: PolicySection) {
  console.info("save PolicySection", payload);
  return payload;
}
