"use client";

import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAira } from "./aira-context";
import { useJourney } from "./journey-context";
import { askSalesAgent } from "./sales-agent/client";
import { DEFAULT_LEAD } from "./sales-agent/prompt";
import type { LeadState, SalesMessage } from "./sales-agent/types";

export interface VoiceCommand {
  /** One or more phrases that should trigger this command (e.g. an option's label plus synonyms). */
  labels: string[];
  action: (heard: string) => void;
  /** Optional custom matcher, checked before label-based fuzzy matching — for
   * open-ended answers a fixed label list can't cover (e.g. "40", "40L", "40
   * lakh" all meaning the same budget bucket). When any registered command's
   * `test` matches, it wins outright regardless of label scores. */
  test?: (heard: string) => boolean;
}

export type InteractionMode = "talk" | "chat";

interface VoiceContextValue {
  /** Whether the browser supports speech recognition at all (Safari/Firefox largely don't). */
  supported: boolean;
  listening: boolean;
  /** The most recent thing the user said (by voice or typed chat), for on-screen feedback. */
  heard: string | null;
  /** Why the mic last failed (permission denied, no speech detected, etc.) — surfaced in the UI instead of failing silently. */
  micError: string | null;
  toggleListening: () => void;
  /** Proactively triggers the browser's mic permission prompt (e.g. on the
   * welcome screen) so it's already granted by the time the user taps "Talk
   * to Aira" later, instead of interrupting them mid-flow. */
  requestMicPermission: () => void;
  /** Feed typed chat text through the same matching engine voice recognition uses. */
  submitText: (text: string) => void;
  /** Screens call this (via useVoiceCommands) to register what they can respond to while mounted. */
  registerCommands: (commands: VoiceCommand[]) => () => void;
  /**
   * "talk" (Aira full-screen, voice-driven) is the default presentation;
   * "chat" is an opt-in secondary mode for typing instead — shared between
   * the CTA bar and the avatar widget so both stay in sync.
   */
  mode: InteractionMode;
  setMode: (mode: InteractionMode) => void;
  /**
   * Whether Aira's avatar is shown expanded, in the same bottom-half split
   * used by chat (see app/page.tsx) rather than as a full-screen overlay.
   * Lives here so both the CTA bar and the floating widget can read/set it.
   */
  avatarExpanded: boolean;
  setAvatarExpanded: (expanded: boolean) => void;
  /**
   * Whether a screen is presenting Aira as a full-screen "video call" (see
   * Screen02BuyerProfile's question flow) rather than the small floating
   * bottom-right widget. Lives here so app/page.tsx can hide that widget
   * for the duration — otherwise it would float redundantly on top of the
   * full-screen avatar the screen itself is already showing.
   */
  callActive: boolean;
  setCallActive: (active: boolean) => void;
  /**
   * Screens with a multi-question voice flow (e.g. Screen02BuyerProfile)
   * call this whenever the user answers by tapping instead of speaking —
   * it stops the mic if it's open and stops it from auto-reopening after
   * Aira's next line (see the auto-continue effect below), so a manual tap
   * can't be second-guessed a moment later by the mic picking up unrelated
   * background audio. Voice stays available any time the user taps "Talk to
   * Aira" again — this only cancels the *automatic* reopening.
   */
  pauseVoiceInput: () => void;
}

const VoiceContext = createContext<VoiceContextValue | null>(null);

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

// Two words "match" if they're identical, or one is a reasonably long prefix
// of the other — e.g. "invest"/"investment" or "personal"/"personally". This
// is what lets natural spoken answers ("I want to invest in it") match an
// option label ("Investment") even though the exact word form differs;
// plain equality alone missed most conjugations, which was the app's main
// voice-matching gap on free-form answers (like the buyer-profile screen's
// 3 opening questions).
function wordsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  return a.startsWith(b) || b.startsWith(a);
}

/** Score how well a spoken phrase matches a command label: substring match beats partial word overlap. */
function matchScore(heard: string, label: string): number {
  const h = normalize(heard);
  const l = normalize(label);
  if (!h || !l) return 0;
  if (h === l) return 1000;
  if (h.includes(l) || l.includes(h)) return 100 + l.length;
  const hWords = Array.from(new Set(h.split(/\s+/)));
  const lWords = l.split(/\s+/);
  const overlap = lWords.filter((w) => hWords.some((hw) => wordsMatch(hw, w))).length;
  return overlap / lWords.length >= 0.6 ? overlap : 0;
}

export function VoiceCommandProvider({ children }: { children: React.ReactNode }) {
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [mode, setMode] = useState<InteractionMode>("talk");
  const [avatarExpanded, setAvatarExpanded] = useState(false);
  const [callActive, setCallActive] = useState(false);

  const recognitionRef = useRef<any>(null);
  const commandsRef = useRef<VoiceCommand[]>([]);
  const salesHistoryRef = useRef<SalesMessage[]>([]);
  const leadRef = useRef<LeadState>({ ...DEFAULT_LEAD });

  // "Latest ref" pattern: handleTranscript below is a stable useCallback with
  // no dependencies (recreating it would tear down and rebuild the
  // SpeechRecognition instance — see its effect). These refs let it always
  // read the current speak() and journey context without needing to be
  // recreated whenever the buyer's profile, project or pocket changes.
  const { speak, isSpeaking } = useAira();
  const { selectedProject } = useJourney();
  const speakRef = useRef(speak);
  speakRef.current = speak;
  // Tracks whether the user has engaged voice at least once during the
  // current "call" (see callActive) — e.g. Screen02BuyerProfile's 3
  // profiling questions. Once true, the mic is reopened automatically after
  // each of Aira's replies so a multi-question voice exchange feels like one
  // continuous conversation instead of requiring a fresh tap on "Talk to
  // Aira" before every single answer. A manual tap (see pauseVoiceInput)
  // cancels this, so voice can't second-guess an answer picked by hand.
  const conversationActiveRef = useRef(false);
  const wasSpeakingRef = useRef(false);
  const resultReceivedRef = useRef(false);
  // Mirrors callActive state for handleTranscript below, which is a stable
  // useCallback with no deps (see its own comment) — a ref is how it reads
  // the current value without being recreated every time callActive flips.
  const callActiveRef = useRef(false);
  callActiveRef.current = callActive;
  // See handleTranscript: once a match fires, ignore any further transcript
  // for a short window — closes out trailing partial-result stragglers from
  // the same utterance that would otherwise be checked against whatever
  // command set is registered by the time they arrive.
  const suppressUntilRef = useRef(0);

  const registerCommands = useCallback((commands: VoiceCommand[]) => {
    commandsRef.current = commands;
    return () => {
      // Guard against an out-of-order unmount cleanup clearing a newer
      // screen's just-registered commands (defensive — this app's
      // AnimatePresence mode="wait" shouldn't overlap screens anyway).
      if (commandsRef.current === commands) commandsRef.current = [];
    };
  }, []);

  const handleTranscript = useCallback((text: string) => {
    // Chrome's SpeechRecognition can deliver several onresult callbacks for
    // a single utterance as it refines its guess ("In" -> "Invest" ->
    // "Investment") even with interimResults=false, each looking like a
    // separate final transcript. Once one of those has already matched and
    // moved the conversation on (e.g. answered a profile question and
    // advanced to the next one), a later straggler from the *same*
    // utterance must not be evaluated against whatever command set is
    // registered by then — it would land on the next question's commands,
    // fail to match, and wrongly trigger a reprompt right after a perfectly
    // good answer. suppressUntilRef closes that window.
    if (Date.now() < suppressUntilRef.current) return;

    setHeard(text);

    const testMatch = commandsRef.current.find((cmd) => cmd.test?.(text));
    if (testMatch) {
      suppressUntilRef.current = Date.now() + 1500;
      recognitionRef.current?.abort();
      testMatch.action(text);
      return;
    }

    let best: VoiceCommand | null = null;
    let bestScore = 0;
    for (const cmd of commandsRef.current) {
      for (const label of cmd.labels) {
        const score = matchScore(text, label);
        if (score > bestScore) {
          bestScore = score;
          best = cmd;
        }
      }
    }
    if (best) {
      suppressUntilRef.current = Date.now() + 1500;
      recognitionRef.current?.abort();
      best.action(text);
      return;
    }

    // During the buyer-profile "call" (Screen02's 3 profiling questions),
    // Aira should only ever ask her question and accept an answer to it —
    // never hand off to the general Sales Agent mid-profile. If nothing
    // matched, re-prompt for a proper answer instead of routing to the
    // sales agent; the agent only takes over once the profile is built and
    // callActive goes false.
    if (callActiveRef.current) {
      speakRef.current("Sorry, I didn't quite get that — could you say that again, or tap one of the options?");
      return;
    }

    // Nothing on the current screen recognizes this as a command. Route it
    // through the OpenAI Sales Agent. There is deliberately no scripted
    // QA fallback here: if the AI provider is unavailable, the UI should expose the
    // real problem instead of making the avatar appear to be driven by the
    // old pre-fed responses.
    void (async () => {
      try {
        const result = await askSalesAgent({
          message: text,
          context: typeof document !== "undefined" ? document.body.dataset.walkthroughContext || null : null,
          projectId: selectedProject?.id,
          history: salesHistoryRef.current,
          lead: leadRef.current,
        });
        salesHistoryRef.current = [
          ...salesHistoryRef.current,
          { role: "user" as const, content: text },
          { role: "assistant" as const, content: result.response },
        ].slice(-12);
        leadRef.current = result.lead;
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("sales-agent:response", { detail: result }));
        }
        speakRef.current(result.response);
      } catch (error) {
        console.error("[SalesAgent] Request failed:", error);
        speakRef.current("I’m having trouble connecting to the sales assistant right now. Please try again in a moment.");
      }
    })();
  }, []);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    setSupported(true);

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN";
    recognition.onresult = (e: any) => {
      resultReceivedRef.current = true;
      const text = e.results[e.results.length - 1][0].transcript;
      setMicError(null);
      handleTranscript(text);
    };
    recognition.onend = () => {
      setListening(false);
      // Some browsers end the session with neither a result nor an "error"
      // event when they simply fail to pick anything up (mic cut out, or
      // the utterance was too short/quiet to finalize) — without this, that
      // looks identical to a successful listen that produced no match: the
      // button just quietly reverts to "Talk to Aira" with no explanation.
      if (!resultReceivedRef.current) setMicError("Didn't catch that — try again.");
    };
    recognition.onerror = (e: any) => {
      // "aborted" is what fires when handleTranscript itself calls
      // recognition.abort() right after a successful match, to cut off any
      // trailing partial-result stragglers from the same utterance — that's
      // expected and not a real failure, so it shouldn't surface an error.
      if (e.error === "aborted") return;
      // eslint-disable-next-line no-console
      console.error("[Voice] SpeechRecognition error:", e.error);
      const messages: Record<string, string> = {
        "not-allowed": "Mic access is blocked — allow microphone permission for this site and try again.",
        "service-not-allowed": "Mic access is blocked — allow microphone permission for this site and try again.",
        "no-speech": "Didn't catch that — try again.",
        "audio-capture": "No microphone found on this device.",
        network: "Voice recognition needs an internet connection.",
      };
      setMicError(messages[e.error] || "Voice recognition failed — try again.");
      setListening(false);
    };
    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
    };
  }, [handleTranscript]);

  const toggleListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (listening) {
      // An explicit tap to stop mid-conversation means the user wants out —
      // don't auto-reopen the mic after Aira's next line.
      conversationActiveRef.current = false;
      recognition.stop();
      setListening(false);
    } else {
      conversationActiveRef.current = true;
      // getUserMedia/SpeechRecognition are only available in a "secure
      // context" — https, or http on localhost. Opening the app over plain
      // http via a LAN IP (e.g. testing on a phone) silently fails with the
      // browser's generic "not-allowed" error, which looks identical to the
      // user having denied mic access — so we catch it separately here with
      // an actionable message instead of the confusing default one.
      if (typeof window !== "undefined" && window.isSecureContext === false) {
        setMicError("Voice needs a secure connection — open this over HTTPS (or localhost) to use the mic.");
        return;
      }
      setHeard(null);
      setMicError(null);
      resultReceivedRef.current = false;
      try {
        recognition.start();
        setListening(true);
      } catch {
        /* already started — ignore */
      }
    }
  }, [listening]);

  const pauseVoiceInput = useCallback(() => {
    conversationActiveRef.current = false;
    const recognition = recognitionRef.current;
    if (recognition && listening) {
      recognition.stop();
      setListening(false);
    }
  }, [listening]);

  // Once the user has answered by voice at least once during a "call" (see
  // callActive — e.g. Screen02BuyerProfile's 3 profiling questions), reopen
  // the mic automatically as soon as Aira finishes speaking her next line,
  // instead of leaving it to the user to tap "Talk to Aira" again for every
  // question. SpeechRecognition itself is one-shot (continuous = false, so
  // it always stops right after a result), so this is what makes multi-turn
  // voice answers feel continuous rather than requiring a fresh tap each time.
  useEffect(() => {
    const justStoppedSpeaking = wasSpeakingRef.current && !isSpeaking;
    wasSpeakingRef.current = isSpeaking;
    if (!justStoppedSpeaking) return;
    if (!conversationActiveRef.current || !callActive || mode !== "talk" || listening) return;
    const recognition = recognitionRef.current;
    if (!recognition) return;
    resultReceivedRef.current = false;
    try {
      recognition.start();
      setListening(true);
    } catch {
      /* already started, or recognition unavailable right now — ignore */
    }
  }, [isSpeaking, callActive, mode, listening]);

  // Leaving the call (or switching to chat) ends the voice exchange — don't
  // let a stale flag reopen the mic on some later, unrelated screen.
  useEffect(() => {
    if (!callActive || mode !== "talk") conversationActiveRef.current = false;
  }, [callActive, mode]);

  const submitText = useCallback(
    (text: string) => {
      if (text.trim()) handleTranscript(text.trim());
    },
    [handleTranscript]
  );

  const requestMicPermission = useCallback(() => {
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      setMicError("Voice needs a secure connection — open this over HTTPS (or localhost) to use the mic.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) return;
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => stream.getTracks().forEach((t) => t.stop()))
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[Voice] Mic permission request failed:", err);
        if (err?.name === "NotAllowedError") {
          setMicError("Mic access is blocked — allow microphone permission for this site and try again.");
        } else if (err?.name === "NotFoundError") {
          setMicError("No microphone found on this device.");
        }
      });
  }, []);

  return (
    <VoiceContext.Provider
      value={{
        supported,
        listening,
        heard,
        micError,
        toggleListening,
        requestMicPermission,
        submitText,
        registerCommands,
        mode,
        setMode,
        avatarExpanded,
        setAvatarExpanded,
        callActive,
        setCallActive,
        pauseVoiceInput,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error("useVoice must be used within a VoiceCommandProvider");
  return ctx;
}

/**
 * Register the given voice commands for as long as the calling screen is
 * mounted. Deliberately re-registers on every render (no dependency array)
 * rather than only when label text changes: a command's `action` closure
 * often captures per-render state (e.g. "which step am I on"), and only
 * re-running when labels change would leave that closure stale — the
 * command would keep acting on whatever state existed when the screen first
 * mounted. registerCommands() is a cheap ref assignment, so re-running it
 * every render costs nothing meaningful.
 */
export function useVoiceCommands(commands: VoiceCommand[]) {
  const ctx = useContext(VoiceContext);
  const latestCommands = useRef(commands);
  latestCommands.current = commands;

  // Register a stable proxy once per mounted screen. Its handlers always
  // resolve against the latest question, even if recognition finishes during
  // a React re-render or the avatar switches between talk and chat views.
  useLayoutEffect(() => {
    if (!ctx) return;
    const proxy: VoiceCommand[] = [{
      labels: [],
      test: (heard) => latestCommands.current.some((cmd) =>
        cmd.test?.(heard) || cmd.labels.some((label) => matchScore(heard, label) > 0)
      ),
      action: (heard) => {
        const custom = latestCommands.current.find((cmd) => cmd.test?.(heard));
        if (custom) return custom.action(heard);
        let best: VoiceCommand | null = null;
        let score = 0;
        for (const cmd of latestCommands.current) {
          for (const label of cmd.labels) {
            const current = matchScore(heard, label);
            if (current > score) { score = current; best = cmd; }
          }
        }
        best?.action(heard);
      },
    }];
    return ctx.registerCommands(proxy);
  }, [ctx?.registerCommands]);
}
