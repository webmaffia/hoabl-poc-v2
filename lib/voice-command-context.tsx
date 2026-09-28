"use client";

import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAira } from "./aira-context";
import { useJourney } from "./journey-context";
import { useConversation } from "./conversation-context";

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
  /**
   * Push-to-talk: start listening for as long as the user holds the mic
   * button, and only resolve what they said once they release it (see
   * endHold). Unlike toggleListening's tap-to-start behaviour, this puts the
   * recognizer in `continuous` mode for the duration of the hold — the
   * browser's own SpeechRecognition otherwise finalizes (and fires onend)
   * the moment it detects *any* pause in speech, which is what was cutting
   * users off mid-question before they'd finished a sentence with a natural
   * pause in it. Holding the button is what now marks "the question is
   * over", not a brief silence.
   */
  startHold: () => void;
  /** Ends a startHold() session — stops recognition and resolves the full,
   * accumulated transcript from the whole hold (see onresult/onend below). */
  endHold: () => void;
  /** Proactively triggers the browser's mic permission prompt (e.g. on the
   * welcome screen) so it's already granted by the time the user taps "Talk
   * to Aira" later, instead of interrupting them mid-flow. */
  requestMicPermission: () => void;
  /** Feed typed chat text through the same matching engine voice recognition uses. */
  submitText: (text: string) => void;
  /** Screens call this (via useVoiceCommands) to register what they can respond to while mounted. */
  registerCommands: (commands: VoiceCommand[]) => () => void;
  /**
   * Registers a fallback intent resolver for as long as the calling screen
   * is mounted — called only once nothing in registerCommands' list matched
   * *and* the debounce below has settled on the final fragment of the
   * utterance (see handleTranscript's callActiveRef branch), so it always
   * sees a complete utterance rather than a partial one Chrome is still
   * refining. Resolves `true` if it handled the utterance (e.g. matched it
   * to an option itself), `false` to fall back to the generic re-prompt.
   * Used by Screen02BuyerProfile to ask the LLM which profiling option a
   * free-form answer meant, instead of just re-prompting on every phrasing
   * its own exact-label/synonym matchers didn't anticipate.
   */
  registerIntentFallback: (resolver: ((heard: string) => Promise<boolean>) | null) => void;
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
   * call this whenever the user answers by tapping instead of speaking — it
   * stops the mic if it's still open from a hold, so a manual tap can't be
   * second-guessed a moment later by a stray recognition result. Voice
   * stays available any time the user holds the mic button again.
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
  // h.includes(l) (the full label appears inside a longer spoken sentence)
  // is safe at any length. l.includes(h) is the risky direction: Chrome's
  // SpeechRecognition can deliver several onresult callbacks for one
  // utterance as it refines its guess ("In" -> "Invest" -> "Investment"),
  // and a short early fragment like "In" is a substring of almost any
  // label ("Investment", "Interested", ...) — treating that as a real
  // match aborts recognition (see handleTranscript) before the complete,
  // actually-resolvable word ever arrives. Require a non-trivial fragment
  // length here, matching the threshold wordsMatch already uses below.
  if (h.includes(l) || (h.length >= 4 && l.includes(h))) return 100 + l.length;
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
  const intentFallbackRef = useRef<((heard: string) => Promise<boolean>) | null>(null);

  // "Latest ref" pattern: handleTranscript below is a stable useCallback with
  // no dependencies (recreating it would tear down and rebuild the
  // SpeechRecognition instance — see its effect). These refs let it always
  // read the current speak()/sendUserMessage and journey context without
  // needing to be recreated whenever the buyer's profile, project or pocket
  // changes.
  const { speak } = useAira();
  const { buyerName } = useJourney();
  const { sendUserMessage } = useConversation();
  const speakRef = useRef(speak);
  speakRef.current = speak;
  const sendUserMessageRef = useRef(sendUserMessage);
  sendUserMessageRef.current = sendUserMessage;
  // "Latest ref" for the same reason as speakRef — handleTranscript is a
  // stable useCallback with no deps, so it can't close over buyerName
  // directly and still see it update once the identity-capture screen sets
  // it mid-conversation.
  const buyerNameRef = useRef(buyerName);
  buyerNameRef.current = buyerName;
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
  // Debounces the two "nothing matched a command" branches below (the
  // buyer-profile re-prompt and the general Sales Agent handoff) — unlike
  // command matching, which deliberately reacts to the first confident
  // fragment, these branches have no natural "that's a match, stop" signal,
  // so without this every one of Chrome's several same-utterance refinement
  // fragments ("Yes" -> "Yes I" -> "Yes I have a time") fired its own
  // separate re-prompt or Sales Agent request — visibly, a run of duplicate
  // chat bubbles and paraphrased replies to what was really one answer.
  // Rescheduling on every fragment and only firing once fragments stop
  // arriving means exactly one call, using the longest (most complete) one.
  const pendingFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Push-to-talk state (see startHold/endHold). While true, onresult below
  // accumulates transcript pieces instead of acting on them immediately —
  // recognition is put in `continuous` mode for the hold, so it can (and
  // often will) deliver several finalized phrases before the user releases
  // the button, and only the full, concatenated utterance should be
  // evaluated against the registered commands.
  const holdModeRef = useRef(false);
  const heldTranscriptsRef = useRef<string[]>([]);
  // Defensive: set when startHold is called while recognition is somehow
  // already listening in plain, non-hold mode (nothing currently starts a
  // non-hold listen on its own, but toggleListening remains part of the
  // public API) — the old session is aborted, and onend below restarts it
  // fresh in hold mode rather than silently doing nothing.
  const pendingHoldRestartRef = useRef(false);
  const clearPendingFallback = () => {
    if (pendingFallbackRef.current) {
      clearTimeout(pendingFallbackRef.current);
      pendingFallbackRef.current = null;
    }
  };

  const registerIntentFallback = useCallback((resolver: ((heard: string) => Promise<boolean>) | null) => {
    intentFallbackRef.current = resolver;
  }, []);

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
      clearPendingFallback();
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
      clearPendingFallback();
      suppressUntilRef.current = Date.now() + 1500;
      recognitionRef.current?.abort();
      best.action(text);
      return;
    }

    // Neither branch below has a "that's a match, stop" signal the way
    // command matching does above, so — unlike those — don't act on this
    // fragment immediately. Reschedule on every call; only the last
    // fragment of the utterance (the one after which no newer one arrives
    // for 600ms) actually fires. See pendingFallbackRef above.
    clearPendingFallback();
    pendingFallbackRef.current = setTimeout(() => {
      pendingFallbackRef.current = null;

      // During the buyer-profile "call" (Screen02's 3 profiling questions),
      // Aira should only ever ask her question and accept an answer to it —
      // never hand off to the general Sales Agent mid-profile. If nothing
      // matched, re-prompt for a proper answer instead of routing to the
      // sales agent; the agent only takes over once the profile is built
      // and callActive goes false.
      if (callActiveRef.current) {
        if (intentFallbackRef.current) {
          void intentFallbackRef.current(text).then((handled) => {
            if (!handled) {
              speakRef.current("Sorry, I didn't quite get that — could you say that again, or tap one of the options?");
            }
          });
        } else {
          speakRef.current("Sorry, I didn't quite get that — could you say that again, or tap one of the options?");
        }
        return;
      }

      // Nothing on the current screen recognizes this as a command. Route it
      // through the OpenAI Sales Agent (via the shared conversation
      // transcript — see lib/conversation-context.tsx — so this turn is
      // also visible if the user switches to the typed chat dock). There is
      // deliberately no scripted QA fallback here: if the AI provider is
      // unavailable, the UI should expose the real problem instead of
      // making the avatar appear to be driven by the old pre-fed responses.
      void sendUserMessageRef.current(text, {
        context: typeof document !== "undefined" ? document.body.dataset.walkthroughContext || null : null,
        // The identity-capture screen captures the buyer's name directly (a
        // reliable, structured source) — sendUserMessage prefers it over
        // waiting for the LLM to infer a name from conversation, but won't
        // clobber a name the LLM already picked up before that screen ran.
        buyerName: buyerNameRef.current,
      });
    }, 600);
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
      if (holdModeRef.current) {
        // Don't act yet — just accumulate. The user is still holding the
        // button, so this phrase isn't necessarily the whole question (see
        // startHold's comment on why `continuous` mode is used for holds).
        heldTranscriptsRef.current.push(text);
        setHeard(heldTranscriptsRef.current.join(" "));
        return;
      }
      handleTranscript(text);
    };
    recognition.onend = () => {
      setListening(false);
      if (pendingHoldRestartRef.current) {
        pendingHoldRestartRef.current = false;
        holdModeRef.current = true;
        heldTranscriptsRef.current = [];
        setHeard(null);
        setMicError(null);
        resultReceivedRef.current = false;
        recognition.continuous = true;
        try {
          recognition.start();
          setListening(true);
        } catch {
          /* ignore — nothing more we can do here */
        }
        return;
      }
      if (holdModeRef.current) {
        holdModeRef.current = false;
        recognition.continuous = false; // restore default for non-hold flows
        const finalText = heldTranscriptsRef.current.join(" ").trim();
        heldTranscriptsRef.current = [];
        if (finalText) {
          handleTranscript(finalText);
        } else if (!resultReceivedRef.current) {
          setMicError("Didn't catch that — try again.");
        }
        return;
      }
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
      recognition.stop();
      setListening(false);
    } else {
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

  const startHold = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (holdModeRef.current) {
      // A previous hold's recognition session is still finalizing (endHold
      // resets the `listening` UI optimistically before that completes —
      // see its comment) — ignore this new press rather than clobbering
      // that pending transcript/state out from under it.
      return;
    }
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      setMicError("Voice needs a secure connection — open this over HTTPS (or localhost) to use the mic.");
      return;
    }
    if (listening) {
      // Already listening in non-hold mode (see pendingHoldRestartRef above)
      // — abort it and let onend restart fresh in hold mode, instead of
      // doing nothing.
      pendingHoldRestartRef.current = true;
      recognition.abort();
      return;
    }
    holdModeRef.current = true;
    heldTranscriptsRef.current = [];
    setHeard(null);
    setMicError(null);
    resultReceivedRef.current = false;
    // Continuous mode is the whole point of a hold: it stops the browser
    // from finalizing recognition on its own the moment it hears a pause,
    // which is exactly what was cutting the user off mid-question before
    // (see the interface comment on startHold above). Restored to false in
    // onend so it doesn't affect toggleListening's plain one-shot listens,
    // which also reuse this same recognition instance.
    recognition.continuous = true;
    try {
      recognition.start();
      setListening(true);
    } catch {
      /* already started — ignore */
    }
  }, [listening]);

  const endHold = useCallback(() => {
    if (!holdModeRef.current) return;
    // Reset the "Listening…" UI the instant the button is released, rather
    // than waiting on the recognizer — .stop() asks it to wrap up and
    // deliver a final result, but some browsers are slow (or, in
    // `continuous` mode with no speech detected, occasionally just never)
    // to actually fire `onend` afterwards. Without this, the button was
    // getting stuck showing "Listening…" indefinitely after the user had
    // already let go. onend (above) still does the real work — reading
    // back heldTranscriptsRef and resolving the full utterance — whenever
    // it does fire.
    setListening(false);
    const recognition = recognitionRef.current;
    recognition?.stop();
    // Safety net for the "onend never fires" case above: force it via the
    // more forceful abort() shortly after, if the hold hasn't already been
    // resolved by then.
    setTimeout(() => {
      if (holdModeRef.current) recognition?.abort();
    }, 800);
  }, []);

  const pauseVoiceInput = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition && listening) {
      recognition.stop();
      setListening(false);
    }
  }, [listening]);

  // Previously the mic reopened automatically as soon as Aira finished
  // speaking her next line, so a multi-question voice flow (e.g.
  // Screen02BuyerProfile) felt continuous without a fresh tap each time.
  // Now that "Talk to Aira" is press-and-hold rather than tap-to-toggle,
  // that auto-reopen fights the new interaction model outright — it was
  // silently starting a plain, non-hold listen right after every answer,
  // which the hold button couldn't take over (see startHold's `listening`
  // guard) and which the user never asked to start. Voice input is now
  // always explicit: only startHold/endHold open the mic.

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
        startHold,
        endHold,
        requestMicPermission,
        submitText,
        registerCommands,
        registerIntentFallback,
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

/**
 * Registers the given resolver as the calling screen's fallback for once
 * none of its useVoiceCommands entries matched — see registerIntentFallback
 * above for when it runs and what its return value means. Same latest-ref
 * pattern as useVoiceCommands, for the same reason (the resolver closure
 * captures per-render state like "which question is this").
 */
export function useIntentFallback(resolver: ((heard: string) => Promise<boolean>) | null) {
  const ctx = useContext(VoiceContext);
  const latestResolver = useRef(resolver);
  latestResolver.current = resolver;

  useLayoutEffect(() => {
    if (!ctx) return;
    ctx.registerIntentFallback((heard) => {
      const current = latestResolver.current;
      return current ? current(heard) : Promise.resolve(false);
    });
    return () => ctx.registerIntentFallback(null);
  }, [ctx?.registerIntentFallback]);
}
