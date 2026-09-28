import { NextResponse } from "next/server";

export const runtime = "nodejs";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";

interface IntentRequest {
  question: string;
  options: { value: string; label: string }[];
  heard: string;
}

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["value"],
  properties: {
    // Populated per-request below with the actual option values, since the
    // schema has to enumerate exactly what's valid for *this* question.
    value: { type: ["string", "null"] },
  },
};

/**
 * The buyer-profile screen's 3 questions (Screen02BuyerProfile) match a
 * spoken/typed answer against each option's exact label plus a handful of
 * hand-written synonym patterns (see resolvePurposeFromSpeech, the budget
 * regexes, etc). Real free-form phrasing keeps slipping past those — this
 * route is the fallback for exactly that case: hand the question, its
 * options, and what the user actually said to the LLM and ask it which
 * option (if any) they meant, instead of just re-prompting on every regex
 * miss.
 */
export async function POST(request: Request) {
  let body: IntentRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.heard?.trim() || !Array.isArray(body.options) || body.options.length === 0) {
    return NextResponse.json({ error: "heard and options are required." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[BuyerProfileIntent] OPENAI_API_KEY is not configured.");
    return NextResponse.json({ value: null });
  }

  const schema = {
    ...RESPONSE_SCHEMA,
    properties: {
      value: { type: ["string", "null"], enum: [...body.options.map((o) => o.value), null] },
    },
  };

  const optionLines = body.options.map((o) => `- ${o.value}: "${o.label}"`).join("\n");
  const systemPrompt = `A land-buying assistant just asked a buyer: "${body.question}"\n\nThe possible answers are:\n${optionLines}\n\nGiven what the buyer actually said, return the "value" of the single option they most likely meant. If their answer genuinely doesn't match any option (e.g. it's a different question, or nonsense), return null. Do not guess wildly — only match when their intent is reasonably clear.`;

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        reasoning: { effort: "low" },
        input: [
          { role: "system" as const, content: systemPrompt },
          { role: "user" as const, content: body.heard.trim() },
        ],
        max_output_tokens: 200,
        store: false,
        text: {
          format: {
            type: "json_schema",
            name: "buyer_profile_intent",
            strict: true,
            schema,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[BuyerProfileIntent] OpenAI error (${response.status}):`, errorText);
      return NextResponse.json({ value: null });
    }

    const data = await response.json();
    const raw = typeof data?.output_text === "string"
      ? data.output_text
      : (data?.output || [])
          .flatMap((item: any) => (Array.isArray(item?.content) ? item.content : []))
          .filter((item: any) => item?.type === "output_text" && typeof item?.text === "string")
          .map((item: any) => item.text)
          .join("\n")
          .trim();

    if (!raw) return NextResponse.json({ value: null });

    try {
      const parsed = JSON.parse(raw);
      return NextResponse.json({ value: typeof parsed?.value === "string" ? parsed.value : null });
    } catch {
      console.error("[BuyerProfileIntent] OpenAI returned non-JSON output:", raw);
      return NextResponse.json({ value: null });
    }
  } catch (error) {
    console.error("[BuyerProfileIntent] OpenAI connection failed:", error);
    return NextResponse.json({ value: null });
  }
}
