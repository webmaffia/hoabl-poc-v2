import { getProjectKnowledge, listProjectKnowledge } from "./registry";
import type { ProjectKnowledgePackage } from "./types";
import { embedQuery } from "../rag/embeddings";
import { searchChunks } from "../rag/qdrant";

const STOP_WORDS = new Set([
  "what", "where", "when", "which", "about", "tell", "me", "the", "is", "are", "can", "you",
  "does", "do", "for", "near", "this", "that", "with", "from", "have", "has", "will", "how",
  "much", "any", "there", "and", "or", "to", "of", "a", "an", "in", "on", "it", "i", "we",
]);

function tokens(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9₹\s]/g, " ").split(/\s+/).filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

function flatten(packageData: ProjectKnowledgePackage): Array<{ section: string; text: string }> {
  return Object.entries(packageData.sections).flatMap(([section, items]) => items.map((text) => ({ section, text })));
}

function keywordFallback(project: ProjectKnowledgePackage, query: string, limit: number) {
  const queryTokens = tokens(query);
  return flatten(project)
    .map((item) => {
      const textTokens = new Set(tokens(item.text));
      const score = queryTokens.reduce((sum, token) => sum + (textTokens.has(token) ? 1 : 0), 0);
      return { ...item, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ section, text }) => ({ section, text, sourceName: "project-registry", sourceType: "registry", score: 0 }));
}

export async function retrieveProjectKnowledge(projectId: string | null | undefined, query: string, limit = 8) {
  const project = getProjectKnowledge(projectId);
  if (!project) return { project: null, matches: [], source: "no-project-selected" as const };

  // Vector RAG is an optional upgrade. The POC must work out of the box with
  // only OPENAI_API_KEY and the local project registry. Avoid calling Gemini
  // or Qdrant when their environment variables are absent.
  const vectorConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.QDRANT_URL);
  if (vectorConfigured) {
    try {
      const vector = await embedQuery(query);
      const matches = await searchChunks(project.id, vector, limit);
      if (matches.length) return { project, matches, source: "qdrant" as const };
    } catch (error) {
      console.warn("[SalesAgent] Vector retrieval unavailable; using registry fallback.", error instanceof Error ? error.message : error);
    }
  }

  return { project, matches: keywordFallback(project, query, limit), source: "registry-fallback" as const };
}

export function resolveProjectFromMessage(message: string): ProjectKnowledgePackage | null {
  const normalized = message.toLowerCase();
  return listProjectKnowledge().find((project) =>
    [project.name, ...project.aliases].some((alias) => normalized.includes(alias.toLowerCase()))
  ) ?? null;
}
