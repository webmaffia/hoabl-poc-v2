import { NextResponse } from "next/server";
import { buildSalesSystemPrompt, DEFAULT_LEAD } from "@/lib/sales-agent/prompt";
import { retrieveProjectKnowledge, resolveProjectFromMessage } from "@/lib/sales-agent/projects/retrieval";
import { getProjectKnowledge } from "@/lib/sales-agent/projects/registry";
import type {
  LeadState,
  SalesAgentRequest,
  SalesAgentResponse,
  SalesMessage,
} from "@/lib/sales-agent/types";

export const runtime = "nodejs";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";

const SALES_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["response", "stage", "action", "videoTrigger", "lead"],
  properties: {
    response: { type: "string" },
    stage: {
      type: "string",
      enum: ["introduction", "permission", "recap", "opportunity", "qualification", "process", "scheduling", "closure"],
    },
    action: {
      type: "string",
      enum: ["ask_question", "answer", "schedule", "handoff", "close", "token_discussion"],
    },
    videoTrigger: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["id", "title", "src", "reason"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            src: { type: "string" },
            reason: { type: "string" },
          },
        },
        { type: "null" },
      ],
    },
    lead: {
      type: "object",
      additionalProperties: false,
      required: [
        "customerName",
        "objective",
        "configuration",
        "decisionMakers",
        "preferredDate",
        "preferredTime",
        "objections",
        "interest",
        "stage",
      ],
      properties: {
        customerName: { type: ["string", "null"] },
        objective: {
          type: ["string", "null"],
          enum: ["capital_appreciation", "second_home", "rental_income", "mix", null],
        },
        configuration: {
          type: ["string", "null"],
          enum: ["2002_sqft", "2723_sqft", null],
        },
        decisionMakers: { type: "array", items: { type: "string" } },
        preferredDate: { type: ["string", "null"] },
        preferredTime: { type: ["string", "null"] },
        objections: { type: "array", items: { type: "string" } },
        interest: { type: "string", enum: ["unknown", "low", "medium", "high"] },
        stage: {
          type: "string",
          enum: ["introduction", "permission", "recap", "opportunity", "qualification", "process", "scheduling", "closure"],
        },
      },
    },
  },
};

function mergeLead(input?: Partial<LeadState>): LeadState {
  return {
    ...DEFAULT_LEAD,
    ...input,
    decisionMakers: input?.decisionMakers ?? DEFAULT_LEAD.decisionMakers,
    objections: input?.objections ?? DEFAULT_LEAD.objections,
  };
}

function fallbackResponse(lead: LeadState): SalesAgentResponse {
  return {
    response: "I’m having trouble connecting to the sales assistant right now. Please try again in a moment.",
    stage: lead.stage,
    action: "handoff",
    lead,
    videoTrigger: null,
  };
}

export async function POST(request: Request) {
  let body: SalesAgentRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.message?.trim()) {
    return NextResponse.json({ error: "message is required." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[SalesAgent] OPENAI_API_KEY is not configured.");
    return NextResponse.json(
      { error: "Sales assistant is not configured. Add OPENAI_API_KEY to .env.local and restart the server." },
      { status: 500 }
    );
  }

  const lead = mergeLead(body.lead);
  // The UI always sends the selected project. If a project name is mentioned
  // in the user's message, prefer that explicit match; otherwise keep the
  // selected project. Vector RAG is optional for the POC — registry knowledge
  // must work even when Gemini/Qdrant are not configured yet.
  const requestedProject = resolveProjectFromMessage(body.message) ?? getProjectKnowledge(body.projectId) ?? getProjectKnowledge("aero-estate");
  const retrieval = await retrieveProjectKnowledge(requestedProject?.id ?? null, body.message, 8);
  const history: SalesMessage[] = Array.isArray(body.history) ? body.history.slice(-12) : [];

  const messages = [
    { role: "system" as const, content: buildSalesSystemPrompt(lead, requestedProject, retrieval.matches.map((match) => `[${match.section}] ${match.text}`), body.context) },
    ...history.map((message) => ({ role: message.role, content: message.content })),
    { role: "user" as const, content: body.message.trim() },
  ];

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        reasoning: { effort: process.env.OPENAI_REASONING_EFFORT || "low" },
        input: messages,
        max_output_tokens: 700,
        store: false,
        text: {
          format: {
            type: "json_schema",
            name: "sales_agent_response",
            strict: true,
            schema: SALES_RESPONSE_SCHEMA,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SalesAgent] OpenAI error (${response.status}):`, errorText);
      return NextResponse.json(
        { error: `OpenAI request failed (${response.status}). Check OPENAI_API_KEY and OPENAI_MODEL.` },
        { status: 502 }
      );
    }

    const data = await response.json();

    // The raw REST Responses API returns model text inside output[].content[].
    // `output_text` is an SDK convenience helper, so do not depend on it when
    // using fetch directly. This was the reason the POC could receive HTTP 200
    // from OpenAI but still show the generic connection-error message.
    const raw = typeof data?.output_text === "string"
      ? data.output_text
      : (data?.output || [])
          .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
          .filter((item: any) => item?.type === "output_text" && typeof item?.text === "string")
          .map((item: any) => item.text)
          .join("\n")
          .trim();

    if (!raw) {
      const refusal = (data?.output || [])
        .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
        .find((item: any) => item?.type === "refusal")?.refusal;
      console.error("[SalesAgent] OpenAI returned no usable text:", refusal || data);
      return NextResponse.json(fallbackResponse(lead));
    }

    let parsed: SalesAgentResponse;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("[SalesAgent] OpenAI returned non-JSON output:", raw);
      return NextResponse.json(fallbackResponse(lead));
    }

    return NextResponse.json(parsed);

  } catch (error) {
    console.error("[SalesAgent] OpenAI connection failed:", error);
    return NextResponse.json(
      { error: "Cannot connect to the OpenAI sales assistant right now. Please try again." },
      { status: 502 }
    );
  }
}
