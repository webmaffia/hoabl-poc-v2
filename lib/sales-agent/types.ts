export type SalesStage =
  | "introduction"
  | "permission"
  | "recap"
  | "opportunity"
  | "qualification"
  | "process"
  | "scheduling"
  | "closure";

export type LeadObjective = "capital_appreciation" | "second_home" | "rental_income" | "mix" | null;
export type Configuration = "2002_sqft" | "2723_sqft" | null;

export interface LeadState {
  customerName: string | null;
  objective: LeadObjective;
  configuration: Configuration;
  decisionMakers: string[];
  preferredDate: string | null;
  preferredTime: string | null;
  objections: string[];
  interest: "unknown" | "low" | "medium" | "high";
  stage: SalesStage;
}

export interface SalesMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SalesAgentRequest {
  message: string;
  context?: string | null;
  projectId?: string | null;
  history?: SalesMessage[];
  lead?: Partial<LeadState>;
}

export interface WalkthroughVideoTrigger {
  id: string;
  title: string;
  src: string;
  reason: string;
}

export interface SalesAgentResponse {
  response: string;
  stage: SalesStage;
  lead: LeadState;
  action: "ask_question" | "answer" | "schedule" | "handoff" | "close" | "token_discussion";
  videoTrigger: WalkthroughVideoTrigger | null;
}
