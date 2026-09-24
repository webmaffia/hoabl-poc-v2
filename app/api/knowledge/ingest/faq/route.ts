import { NextResponse } from "next/server";
import { ingestText } from "@/lib/sales-agent/rag/ingest";

export const runtime = "nodejs";

interface FAQItem { question: string; answer: string; section?: string; }

export async function POST(request: Request) {
  try {
    if (process.env.INGESTION_SECRET && request.headers.get("x-ingestion-secret") !== process.env.INGESTION_SECRET) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const projectId = String(body?.projectId || "").trim();
    const faqs: FAQItem[] = Array.isArray(body?.faqs) ? body.faqs : [];
    if (!projectId || !faqs.length) return NextResponse.json({ error: "projectId and faqs are required." }, { status: 400 });

    let chunks = 0;
    for (const faq of faqs) {
      if (!faq?.question?.trim() || !faq?.answer?.trim()) continue;
      const result = await ingestText({
        projectId,
        sourceName: "faq",
        sourceType: "faq",
        section: faq.section || "faq",
        text: `Question: ${faq.question.trim()}\nAnswer: ${faq.answer.trim()}`,
      });
      chunks += result.chunks;
    }

    return NextResponse.json({ ok: true, projectId, faqs: faqs.length, chunks });
  } catch (error) {
    console.error("[Knowledge] FAQ ingestion failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "FAQ ingestion failed." }, { status: 500 });
  }
}
