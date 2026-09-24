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
