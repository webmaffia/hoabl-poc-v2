"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAira } from "./aira-context";
import { useJourney } from "./journey-context";
import { askSalesAgent } from "./sales-agent/client";
import { DEFAULT_LEAD } from "./sales-agent/prompt";
import type { LeadState, SalesMessage } from "./sales-agent/types";

export interface ChatMsg {
  id: string;
  from: "aira" | "user";
  text: string;
}

interface ConversationContextValue {
  /** The full Sales Agent conversation so far — whether each turn came in
   * by voice or by typing in the chat dock, so switching between "Talk to
   * Aira" and chat mode mid-conversation always shows everything said. */
  messages: ChatMsg[];
  /**
   * Sends `text` as the user's turn to the Sales Agent, appends both sides
   * of the exchange to the shared transcript above, and speaks Aira's
   * reply. Used by both the typed chat dock and voice's general Q&A
   * fallback (see voice-command-context's handleTranscript) — previously
   * each kept its own separate history/lead, so a conversation started one
   * way silently lost its context (and was invisible) if the user switched
   * to the other.
   */
  sendUserMessage: (text: string, opts?: { context?: string | null; buyerName?: string | null }) => Promise<void>;
}

const ConversationContext = createContext<ConversationContextValue | null>(null);

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const { speak } = useAira();
  const { selectedProject } = useJourney();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const historyRef = useRef<SalesMessage[]>([]);
  const leadRef = useRef<LeadState>({ ...DEFAULT_LEAD });

  // Old turns about a previously-active project shouldn't linger in history
  // (or the project-specific configuration pick, which names an option that
  // means nothing for a different project) once the buyer moves to a
  // different one — buyer-level fields (name, objective, decision makers)
  // still carry over since those describe the buyer, not the project.
  const lastProjectIdRef = useRef(selectedProject?.id);
  useEffect(() => {
    if (selectedProject?.id === lastProjectIdRef.current) return;
    lastProjectIdRef.current = selectedProject?.id;
    historyRef.current = [];
    leadRef.current = { ...leadRef.current, configuration: null };
  }, [selectedProject?.id]);

  const sendUserMessage = useCallback(
    async (text: string, opts?: { context?: string | null; buyerName?: string | null }) => {
      const question = text.trim();
      if (!question) return;
      setMessages((prev) => [...prev, { id: `u-${Date.now()}`, from: "user", text: question }]);

      try {
        if (opts?.buyerName && !leadRef.current.customerName) {
          leadRef.current = { ...leadRef.current, customerName: opts.buyerName };
        }
        const result = await askSalesAgent({
          message: question,
          context: opts?.context ?? null,
          projectId: selectedProject?.id,
          history: historyRef.current,
          lead: leadRef.current,
        });
        historyRef.current = [
          ...historyRef.current,
          { role: "user" as const, content: question },
          { role: "assistant" as const, content: result.response },
        ].slice(-12);
        leadRef.current = result.lead;
        setMessages((prev) => [...prev, { id: `a-${Date.now()}`, from: "aira", text: result.response }]);
        speak(result.response);
        // Screen05ProjectWalkthrough listens for this to trigger an inline
        // video the model selected — kept as a window event (rather than
        // this context returning it) since that screen isn't necessarily an
        // ancestor of whichever component called sendUserMessage.
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("sales-agent:response", { detail: result }));
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[SalesAgent] Request failed:", error);
        const answer = "I’m having trouble connecting to the sales assistant right now. Please try again in a moment.";
        setMessages((prev) => [...prev, { id: `a-${Date.now()}`, from: "aira", text: answer }]);
        speak(answer);
      }
    },
    [speak, selectedProject?.id]
  );

  return <ConversationContext.Provider value={{ messages, sendUserMessage }}>{children}</ConversationContext.Provider>;
}

export function useConversation() {
  const ctx = useContext(ConversationContext);
  if (!ctx) throw new Error("useConversation must be used within a ConversationProvider");
  return ctx;
}
