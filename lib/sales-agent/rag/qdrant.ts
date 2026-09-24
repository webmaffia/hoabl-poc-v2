import { createHash } from "node:crypto";
import { QDRANT_API_KEY, QDRANT_COLLECTION, QDRANT_URL } from "./config";

export interface KnowledgeChunk {
  projectId: string;
  text: string;
  section: string;
  sourceName: string;
  sourceType: "pdf" | "faq" | "registry";
  chunkIndex: number;
}

function headers() {
  return {
    "Content-Type": "application/json",
    ...(QDRANT_API_KEY ? { "api-key": QDRANT_API_KEY } : {}),
  };
}

async function qdrant(path: string, init?: RequestInit) {
  if (!QDRANT_URL) throw new Error("QDRANT_URL is not configured.");
  const response = await fetch(`${QDRANT_URL}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers || {}) },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Qdrant request failed (${response.status}): ${text}`);
  }
  return response.json();
}

export async function ensureCollection(dimensions: number) {
  if (!QDRANT_URL) throw new Error("QDRANT_URL is not configured.");
  const existing = await fetch(`${QDRANT_URL}/collections/${encodeURIComponent(QDRANT_COLLECTION)}`, {
    headers: headers(),
  });
  if (existing.ok) return;

  await qdrant(`/collections/${encodeURIComponent(QDRANT_COLLECTION)}`, {
    method: "PUT",
    body: JSON.stringify({ vectors: { size: dimensions, distance: "Cosine" } }),
  });
}

function stableUuid(input: string) {
  const bytes = createHash("sha256").update(input).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export async function upsertChunks(chunks: KnowledgeChunk[], vectors: number[][]) {
  if (chunks.length !== vectors.length) throw new Error("Chunk/vector count mismatch.");
  if (!chunks.length) return;

  await ensureCollection(vectors[0].length);

  const points = chunks.map((chunk, index) => ({
    id: stableUuid(`${chunk.projectId}|${chunk.sourceType}|${chunk.sourceName}|${chunk.section}|${chunk.chunkIndex}|${chunk.text}`),
    vector: vectors[index],
    payload: chunk,
  }));

  for (let start = 0; start < points.length; start += 100) {
    await qdrant(`/collections/${encodeURIComponent(QDRANT_COLLECTION)}/points?wait=true`, {
      method: "PUT",
      body: JSON.stringify({ points: points.slice(start, start + 100) }),
    });
  }
}

export async function searchChunks(
  projectId: string,
  vector: number[],
  limit = 8
): Promise<{ score: number; section: string; text: string; sourceName: string; sourceType: string }[]> {
  const data = await qdrant(`/collections/${encodeURIComponent(QDRANT_COLLECTION)}/points/query`, {
    method: "POST",
    body: JSON.stringify({
      query: vector,
      limit,
      with_payload: true,
      filter: { must: [{ key: "projectId", match: { value: projectId } }] },
    }),
  });

  return (data?.result || []).map((item: { score: number; payload?: KnowledgeChunk }) => ({
    score: item.score,
    section: item.payload?.section || "knowledge",
    text: item.payload?.text || "",
    sourceName: item.payload?.sourceName || "unknown",
    sourceType: item.payload?.sourceType || "registry",
  }));
}
