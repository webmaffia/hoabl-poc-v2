import { NextResponse } from "next/server";
import { ingestText } from "@/lib/sales-agent/rag/ingest";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (process.env.INGESTION_SECRET && request.headers.get("x-ingestion-secret") !== process.env.INGESTION_SECRET) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get("file");
    const projectId = String(form.get("projectId") || "").trim();
    const section = String(form.get("section") || "project").trim();

    if (!(file instanceof File)) return NextResponse.json({ error: "file is required." }, { status: 400 });
    if (!projectId) return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // pdf-parse is intentionally loaded server-side only.
    const pdfParse = (await import("pdf-parse")).default;
    const parsed = await pdfParse(buffer);
    const result = await ingestText({
      projectId,
      sourceName: file.name,
      sourceType: "pdf",
      section,
      text: parsed.text,
    });

    return NextResponse.json({ ok: true, projectId, source: file.name, pages: parsed.numpages, ...result });
  } catch (error) {
    console.error("[Knowledge] PDF ingestion failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "PDF ingestion failed." }, { status: 500 });
  }
}
