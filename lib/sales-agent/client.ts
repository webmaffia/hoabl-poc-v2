import type { LeadState, SalesAgentResponse, SalesMessage } from "./types";

export async function askSalesAgent(params: {
  message: string;
  context?: string | null;
  projectId?: string | null;
  history: SalesMessage[];
  lead: LeadState;
}): Promise<SalesAgentResponse> {
  const response = await fetch("/api/sales-agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Sales AI request failed");
  return data as SalesAgentResponse;
}

/**
 * Asks the LLM which of a fixed set of options a free-form spoken/typed
 * answer meant — used by Screen02BuyerProfile as a fallback once its own
 * exact-label/synonym matching finds nothing, instead of just re-prompting
 * on every phrasing the hand-written matchers didn't anticipate.
 */
export async function classifyBuyerProfileIntent(params: {
  question: string;
  options: { value: string; label: string }[];
  heard: string;
}): Promise<string | null> {
  try {
    const response = await fetch("/api/buyer-profile/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data?.value === "string" ? data.value : null;
  } catch {
    return null;
  }
}
