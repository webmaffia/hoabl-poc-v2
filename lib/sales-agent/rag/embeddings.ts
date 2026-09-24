import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "./config";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

function normalize(values: number[]): number[] {
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  return norm ? values.map((value) => value / norm) : values;
}

async function geminiRequest(body: unknown, path: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const response = await fetch(`${GEMINI_BASE}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini embedding request failed (${response.status}): ${text}`);
  }
  return response.json();
}

export async function embedDocuments(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];

  const all: number[][] = [];
  // Keep batches modest for predictable API payloads.
  for (let start = 0; start < texts.length; start += 50) {
    const batch = texts.slice(start, start + 50);
    const data = await geminiRequest(
      {
        requests: batch.map((text) => ({
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text: `title: none | text: ${text}` }] },
          taskType: "RETRIEVAL_DOCUMENT",
          outputDimensionality: EMBEDDING_DIMENSIONS,
        })),
      },
      `models/${EMBEDDING_MODEL}:batchEmbedContents`,
    );

    const embeddings = data?.embeddings?.map((item: { values?: number[] }) => normalize(item.values || [])) || [];
    if (embeddings.length !== batch.length) throw new Error("Gemini returned an unexpected number of document embeddings.");
    all.push(...embeddings);
  }
  return all;
}

export async function embedQuery(text: string): Promise<number[]> {
  const data = await geminiRequest(
    {
      content: { parts: [{ text: `task: question answering | query: ${text}` }] },
      output_dimensionality: EMBEDDING_DIMENSIONS,
    },
    `models/${EMBEDDING_MODEL}:embedContent`,
  );

  const values = data?.embedding?.values;
  if (!Array.isArray(values)) throw new Error("Gemini returned no query embedding.");
  return normalize(values);
}
