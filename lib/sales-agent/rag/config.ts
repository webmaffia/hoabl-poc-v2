export const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = Number(process.env.GEMINI_EMBEDDING_DIMENSIONS || 768);
export const QDRANT_URL = (process.env.QDRANT_URL || "").replace(/\/$/, "");
export const QDRANT_API_KEY = process.env.QDRANT_API_KEY || "";
export const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "hoabl_sales_knowledge";

export function assertRagConfig() {
  const missing: string[] = [];
  if (!process.env.GEMINI_API_KEY) missing.push("GEMINI_API_KEY");
  if (!QDRANT_URL) missing.push("QDRANT_URL");
  if (missing.length) throw new Error(`RAG is not configured. Missing: ${missing.join(", ")}`);
}
