import { chunkText } from "./chunk";
import { EMBEDDING_DIMENSIONS, assertRagConfig } from "./config";
import { embedDocuments } from "./embeddings";
import { ensureCollection, upsertChunks, type KnowledgeChunk } from "./qdrant";

export async function ingestText(params: {
  projectId: string;
  sourceName: string;
  sourceType: "pdf" | "faq" | "registry";
  section: string;
  text: string;
}) {
  assertRagConfig();
  const chunks = chunkText(params.text);
  if (!chunks.length) return { chunks: 0 };

  const records: KnowledgeChunk[] = chunks.map((text, index) => ({
    projectId: params.projectId,
    text,
    section: params.section,
    sourceName: params.sourceName,
    sourceType: params.sourceType,
    chunkIndex: index,
  }));

  const vectors = await embedDocuments(records.map((record) => record.text));
  await upsertChunks(records, vectors);
  return { chunks: records.length, dimensions: EMBEDDING_DIMENSIONS };
}

export async function initializeVectorCollection() {
  assertRagConfig();
  await ensureCollection(EMBEDDING_DIMENSIONS);
}
