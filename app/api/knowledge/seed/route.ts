import { NextResponse } from "next/server";
import { listProjectKnowledge } from "@/lib/sales-agent/projects/registry";
import { ingestText, initializeVectorCollection } from "@/lib/sales-agent/rag/ingest";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (process.env.INGESTION_SECRET && request.headers.get("x-ingestion-secret") !== process.env.INGESTION_SECRET) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    await initializeVectorCollection();
    const results = [];
    for (const project of listProjectKnowledge()) {
      let chunks = 0;
      for (const [section, items] of Object.entries(project.sections)) {
        for (const text of items) {
          const result = await ingestText({
            projectId: project.id,
            sourceName: "project-registry",
            sourceType: "registry",
            section,
            text,
          });
          chunks += result.chunks;
        }
      }
      results.push({ projectId: project.id, chunks });
    }

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    console.error("[Knowledge] Seed failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Seed failed." }, { status: 500 });
  }
}
