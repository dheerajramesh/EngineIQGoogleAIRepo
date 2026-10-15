import { DEMO_DOCUMENTS } from "../data/documents";
import { DocSnippet, IncidentFinding } from "../types";

export interface RetrievalQuery {
  eventType?: string;
  findings?: IncidentFinding[];
  partId?: string;
  freeText?: string;
}

/**
 * Local vector/keyword hybrid simulation for retrieving relevant AMM/PRC/POL documents.
 * Structured so it can be swapped for a Vertex AI Search or Vector DB client without UI change.
 */
export async function retrieveRelevantDocuments(
  query: RetrievalQuery,
  limit: number = 4
): Promise<DocSnippet[]> {
  const scored = DEMO_DOCUMENTS.map((doc) => {
    let score = 0;
    const docTextLower = (doc.title + " " + doc.text + " " + doc.section).toLowerCase();

    // 1. Part ID matching
    if (query.partId) {
      if (doc.applicableParts?.includes(query.partId as any)) score += 15;
      if (doc.tags.includes(query.partId)) score += 10;
      if (docTextLower.includes(query.partId.replace(/_/g, " "))) score += 5;
    }

    // 2. Event type matching
    if (query.eventType) {
      const ev = query.eventType.toLowerCase();
      if (doc.tags.includes(ev)) score += 12;
      if (docTextLower.includes(ev.replace(/_/g, " "))) score += 6;
      if (ev === "bird_strike" && doc.id === "DEMO-PRC-05-10") score += 20;
      if (ev === "fod" && doc.id === "DEMO-PRC-05-11") score += 20;
      if (ev === "oil_leak" && doc.id === "DEMO-AMM-79-01") score += 20;
      if (ev === "vibration" && doc.id === "DEMO-AMM-77-01") score += 20;
      if (ev === "hot_section" && doc.id === "DEMO-AMM-72-04") score += 20;
    }

    // 3. Findings match
    if (query.findings && query.findings.length > 0) {
      for (const f of query.findings) {
        if (doc.applicableParts?.includes(f.part)) score += 10;
        if (doc.tags.includes(f.part)) score += 8;
        if (doc.tags.includes(f.damageType)) score += 15;

        // Specific rule doc links
        if (f.part === "fan_blades" && doc.id === "DEMO-AMM-72-01") score += 15;
        if (f.part === "fan_case" && doc.id === "DEMO-AMM-72-02") score += 15;
        if (f.part === "hpc" && doc.id === "DEMO-AMM-72-03") score += 15;
        if (f.part === "hpt" && doc.id === "DEMO-AMM-72-04") score += 15;
        if (f.part === "oil_system" && doc.id === "DEMO-AMM-79-01") score += 15;
        if (f.damageType === "vibration" && doc.id === "DEMO-AMM-77-01") score += 15;
      }
    }

    // 4. Free text matching
    if (query.freeText) {
      const words = query.freeText
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3);

      for (const word of words) {
        if (docTextLower.includes(word)) score += 2;
        if (doc.tags.some((t) => t.includes(word))) score += 4;
      }
    }

    // Always include policy doc with moderate baseline relevance
    if (doc.id === "DEMO-POL-02") score += 4; // Sign-off policy is always relevant

    return { doc, score };
  });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.doc);
}

export function getDocumentById(id: string): DocSnippet | undefined {
  return DEMO_DOCUMENTS.find((d) => d.id === id || d.id === id.replace(/\[|\]/g, ""));
}
