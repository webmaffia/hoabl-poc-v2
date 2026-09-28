"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { fetchHeygenToken } from "./heygen";

export type AiraStatus = "connecting" | "live" | "fallback";

interface AiraContextValue {
  status: AiraStatus;
  caption: string;
  isSpeaking: boolean;
  /** Register a <video> element to receive the live track (supports more than one at once — e.g. the persistent header panel and a screen's hero avatar). */
  attachVideo: (el: HTMLVideoElement | null) => void;
  /** Unregister a previously-attached element (call on unmount). */
  detachVideo: (el: HTMLVideoElement | null) => void;
  speak: (text: string) => void;
  /** Cuts off whatever Aira is currently saying — used both when a new
   * line needs to start immediately (so she never lags behind the screen
   * the user has already moved on to) and by an explicit "stop" control. */
  stopSpeaking: () => void;
  /** Whether the user has explicitly muted Aira's audio. Independent of
   * whether she's actually speaking — captions and lip-sync keep working
   * while muted, only the sound is silenced. */
  muted: boolean;
  toggleMute: () => void;
}

const AiraContext = createContext<AiraContextValue | null>(null);

// Rough reading-pace estimate for the local fallback's simulated speaking state.
const MS_PER_CHAR = 45;
const MIN_SPEAK_MS = 1400;
const MAX_SPEAK_MS = 6000;

// Known female Indian-English voice names shipped by common platforms
// (Microsoft Neerja/Heera on Windows + Edge; Google's Indian voices on
// Chrome/Android often carry no gender in the name, so they're matched by
// locale alone below). Named male Indian voices are excluded explicitly so
// they're never preferred over an unnamed-gender Indian voice.
const INDIAN_FEMALE_VOICE_NAMES = ["neerja", "heera", "kalpana", "isha", "priya"];
const INDIAN_MALE_VOICE_NAMES = ["ravi", "prabhat"];

/** Best-effort pick of an Indian female voice from whatever the browser/OS
 * exposes. Availability varies a lot by platform — Windows needs the
 * "English (India)" speech pack installed; Chrome/Android usually has more
 * options. Returns null (caller keeps the browser's default voice) if
 * nothing Indian is installed at all. */
function pickIndianFemaleVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const indian = voices.filter((v) => /^(en-in|hi-in)/i.test(v.lang));
  if (indian.length === 0) return null;

  const namedFemale = indian.find((v) => INDIAN_FEMALE_VOICE_NAMES.some((n) => v.name.toLowerCase().includes(n)));
  if (namedFemale) return namedFemale;

  const notNamedMale = indian.find((v) => !INDIAN_MALE_VOICE_NAMES.some((n) => v.name.toLowerCase().includes(n)));
  return notNamedMale ?? indian[0];
}

export function AiraProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AiraStatus>("connecting");
  const [caption, setCaption] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);

  const sessionRef = useRef<any>(null);
  const startedRef = useRef(false);
  const speakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elementsRef = useRef<Set<HTMLVideoElement>>(new Set());
  const gestureOccurredRef = useRef(false);
  const mutedRef = useRef(false);
  // The most recent speak() text that arrived while the session was still
  // "connecting" (not yet "live") — HeyGen's session.repeat() was never
  // actually called for it, so it must be replayed once the session goes
  // live, or that line is silently lost (this was happening for screen 1's
  // opening line on every load, since connecting takes several seconds).
  const pendingSpeechRef = useRef<string | null>(null);
  // getVoices() returns [] on first call in some browsers (notably Chrome)
  // until the async "voiceschanged" event fires once — cached here so the
  // Indian-voice lookup below still works once it's populated.
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  // The <audio> element currently playing the free network-TTS voice (see
  // speakViaNetworkTTS), if any.
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  // Bumped on every speakFallback()/stopSpeaking() call so an in-flight
  // network-TTS fetch that resolves after being superseded (a newer line
  // started, or playback was stopped) can detect it's stale and no-op
  // instead of playing over/after the newer line.
  const speechRequestIdRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    function loadVoices() {
      voicesRef.current = window.speechSynthesis.getVoices();
    }
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const attachToAll = useCallback(() => {
    if (!sessionRef.current) return;
    elementsRef.current.forEach((el) => {
      try {
        sessionRef.current.attach(el);
      } catch {
        /* element may not be mounted anymore */
      }
    });
  }, []);

  // Free fallback voice, tier 2: the browser's own SpeechSynthesis. Used
  // only when the network TTS below is unreachable — its voices are usually
  // more robotic, but they work fully offline/client-side. No deps on
  // `status` on purpose — this also gets called from connect()'s fallback
  // branches below (via speakFallback), where a `speak()` closure captured
  // at an earlier render could otherwise reference a stale status.
  const speakViaBrowserTTS = useCallback((text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = mutedRef.current ? 0 : 1;

      const voices = voicesRef.current.length ? voicesRef.current : window.speechSynthesis.getVoices();
      const indianVoice = pickIndianFemaleVoice(voices);
      if (indianVoice) utterance.voice = indianVoice;
      // Setting lang even without a matched `voice` still nudges some
      // platforms (e.g. Edge) toward an Indian-locale system voice.
      utterance.lang = indianVoice?.lang ?? "en-IN";

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      return;
    }

    // No SpeechSynthesis available (e.g. an older browser) — simulate a
    // speaking state from estimated reading time so the portrait still
    // feels alive, even without real audio.
    if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    const duration = Math.min(MAX_SPEAK_MS, Math.max(MIN_SPEAK_MS, text.length * MS_PER_CHAR));
    setIsSpeaking(true);
    speakTimerRef.current = setTimeout(() => setIsSpeaking(false), duration);
  }, []);

  // Free fallback voice, tier 1: natural neural TTS via our own
  // /api/aira/speech route (see that file for how/why). Points the <audio>
  // element straight at the route's URL rather than fetch()-ing the whole
  // clip into a blob first, which is simpler but doesn't actually start
  // playback any sooner: traced this directly (server chunks genuinely
  // arrive progressively over the wire — confirmed with a raw Node http
  // client — but Chrome's own <audio> element still holds `readyState` at 0
  // until the entire chunked-with-no-Content-Length stream finishes, then
  // jumps straight to a fully-buffered HAVE_ENOUGH_DATA). So however this is
  // fetched, "audio actually started" is unavoidably ~1-3+ seconds behind
  // "the response text arrived", scaling with how long the line is — that
  // gap, not anything about fetch vs. streaming, was the real cause of the
  // avatar looking frozen/unsynced. Fixed at the call site (speakFallback)
  // instead: the avatar now starts moving immediately when we start trying
  // to speak, not when audio playback actually begins.
  //
  // Failure (bad response, network error, blocked codec) surfaces as the
  // element's `error` event rather than a rejected fetch, so that's what
  // triggers the drop-down to the browser-voice tier here.
  const speakViaNetworkTTS = useCallback(
    (text: string, requestId: number) => {
      const audio = new Audio();
      // Muted-autoplay is allowed by browser policy even before any user
      // gesture (same reasoning as the HeyGen <video> handling below) —
      // unlockAudio() unmutes it on the first gesture.
      audio.muted = gestureOccurredRef.current ? mutedRef.current : true;

      const cleanup = () => {
        setIsSpeaking(false);
        if (audioElRef.current === audio) audioElRef.current = null;
      };
      audio.onended = cleanup;
      audio.onerror = () => {
        cleanup();
        if (requestId === speechRequestIdRef.current) speakViaBrowserTTS(text);
      };

      audioElRef.current = audio;
      audio.src = `/api/aira/speech?text=${encodeURIComponent(text)}`;
      audio.play().catch(() => {
        // Play can reject even for a muted element on some platforms (e.g.
        // iOS Safari can still block it outright with no pending gesture to
        // retry against). Previously this was swallowed silently, leaving
        // isSpeaking stuck true forever since neither onended nor onerror
        // ever fires for audio that never actually started — the avatar
        // then looks like it's talking non-stop. Fall back to browser TTS
        // (which manages its own isSpeaking lifecycle) instead of leaving
        // the state hanging; unlockAudio() will still retry a *currently
        // playing* element on the next gesture, but there's nothing left
        // here for it to retry once we've moved on to the fallback voice.
        cleanup();
        if (requestId === speechRequestIdRef.current) speakViaBrowserTTS(text);
      });
    },
    [speakViaBrowserTTS]
  );

  const speakFallback = useCallback(
    (text: string) => {
      const requestId = ++speechRequestIdRef.current;

      if (audioElRef.current) {
        audioElRef.current.pause();
        audioElRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      // Start the avatar moving the instant we begin trying to speak,
      // rather than waiting for audio.onplay — the network-TTS request can
      // take a few real seconds (see speakViaNetworkTTS), and the avatar
      // sitting frozen for that whole window is what actually read as "not
      // synced to the response", far more than the video being a couple
      // seconds ahead of the sound that eventually catches up to it.
      setIsSpeaking(true);
      speakViaNetworkTTS(text, requestId);
    },
    [speakViaNetworkTTS]
  );

  useEffect(() => {
    // Aira starts speaking on screen 1 before the user has clicked anything,
    // so browsers block that first line's audio (autoplay-with-sound
    // policy) even though the video track plays fine. Unmute on every user
    // gesture (not just the first) — deliberately NOT { once: true }: if the
    // gesture happens before the HeyGen session finishes connecting (it can
    // take 5-12s), there are no video elements registered yet, a one-shot
    // listener would fire on nothing and never run again, and every screen
    // after that would stay silent for the rest of the session.
    function unlockAudio() {
      gestureOccurredRef.current = true;
      elementsRef.current.forEach((el) => {
        el.muted = mutedRef.current;
        el.play().catch(() => {});
      });
      if (audioElRef.current) {
        audioElRef.current.muted = mutedRef.current;
        audioElRef.current.play().catch(() => {});
      }
    }
    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  useEffect(() => {
    // Guards against React 18 Strict Mode's dev-only double-invoke of this
    // effect (mount -> cleanup -> mount, synchronously, before any awaits
    // resolve). startedRef persists across that double-invoke (same ref
    // object), so the *second* invocation's connect() call is skipped here
    // — meaning the FIRST invocation's connect() is the one that must be
    // allowed to run to completion. Deliberately no per-invocation
    // "cancelled" flag: that would let the Strict Mode phantom cleanup
    // (which fires immediately after the first mount) abort the very
    // connect() call this ref exists to protect.
    if (startedRef.current) return;
    startedRef.current = true;

    async function connect() {
      const token = await fetchHeygenToken();
      if (!token) {
        setStatus("fallback");
        if (pendingSpeechRef.current) {
          speakFallback(pendingSpeechRef.current);
          pendingSpeechRef.current = null;
        }
        return;
      }

      try {
        const mod = await import("@heygen/liveavatar-web-sdk");
        const { LiveAvatarSession, SessionEvent, AgentEventsEnum } = mod;

        const session = new LiveAvatarSession(token);
        sessionRef.current = session;

        session.on(SessionEvent.SESSION_STREAM_READY, () => attachToAll());
        session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => setIsSpeaking(true));
        session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => setIsSpeaking(false));
        session.on(SessionEvent.SESSION_DISCONNECTED, () => setStatus("fallback"));

        await session.start();

        setStatus("live");
        attachToAll();
        if (pendingSpeechRef.current) {
          try {
            session.repeat(pendingSpeechRef.current);
          } catch {
            /* ignore — nothing more we can do here */
          }
          pendingSpeechRef.current = null;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[Aira] HeyGen LiveAvatar session failed, falling back:", err);
        setStatus("fallback");
        if (pendingSpeechRef.current) {
          speakFallback(pendingSpeechRef.current);
          pendingSpeechRef.current = null;
        }
      }
    }

    connect();

    // This provider wraps the whole app and is not expected to unmount
    // during normal use, so real teardown here is best-effort only.
    return () => {
      sessionRef.current?.stop?.().catch(() => {});
    };
  }, []);

  const attachVideo = useCallback((el: HTMLVideoElement | null) => {
    if (!el) return;
    elementsRef.current.add(el);
    if (gestureOccurredRef.current) el.muted = mutedRef.current;
    if (sessionRef.current) {
      try {
        sessionRef.current.attach(el);
      } catch {
        /* session not ready yet — attachToAll() will retry on stream-ready */
      }
    }
  }, []);

  const detachVideo = useCallback((el: HTMLVideoElement | null) => {
    if (el) elementsRef.current.delete(el);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      mutedRef.current = next;
      // Only apply to elements once a gesture has unlocked audio — before
      // that they're already muted for autoplay-policy reasons, and forcing
      // muted=false here (on an unmute tap that IS itself the gesture) is
      // handled by the pointerdown/keydown listener firing first.
      if (gestureOccurredRef.current) {
        elementsRef.current.forEach((el) => {
          el.muted = next;
        });
      }
      // The network-TTS <audio> element supports live mute toggling.
      if (audioElRef.current) {
        audioElRef.current.muted = next;
      }
      // SpeechSynthesisUtterance's volume can't be changed once it has
      // started — muting while Aira is talking via the browser-voice
      // fallback cancels the current line outright rather than leaving it
      // audible.
      if (next && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      return next;
    });
  }, []);

  const stopSpeaking = useCallback(() => {
    speechRequestIdRef.current++; // invalidate any in-flight network-TTS fetch
    if (speakTimerRef.current) {
      clearTimeout(speakTimerRef.current);
      speakTimerRef.current = null;
    }
    pendingSpeechRef.current = null;
    setIsSpeaking(false);
    if (sessionRef.current) {
      try {
        sessionRef.current.interrupt();
      } catch {
        /* nothing more we can do here */
      }
    }
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      setCaption(text);
      if (speakTimerRef.current) clearTimeout(speakTimerRef.current);

      if (status === "live" && sessionRef.current) {
        try {
          // HeyGen queues repeat() calls rather than replacing the current
          // line — without interrupting first, answering a question before
          // Aira finishes the previous one queues both up, so she keeps
          // talking about an earlier question after the user has already
          // moved on. Interrupting first keeps her in sync with the screen.
          sessionRef.current.interrupt();
          sessionRef.current.repeat(text);
        } catch {
          /* live speak failed — caption still updated above */
        }
        return;
      }

      if (status === "connecting") {
        // Session isn't live yet — remember this line so it can be replayed
        // once we know which way this goes: HeyGen repeats it once live, or
        // the free browser-voice fallback speaks it (see connect() above).
        // Don't speak it now — if HeyGen still connects successfully a
        // moment later, we'd get both voices talking over each other.
        pendingSpeechRef.current = text;
        return;
      }

      // status === "fallback": no live HeyGen session (disabled, unconfigured,
      // or disconnected) — speak with the browser's own free TTS voice.
      speakFallback(text);
    },
    [status, speakFallback]
  );

  return (
    <AiraContext.Provider
      value={{ status, caption, isSpeaking, attachVideo, detachVideo, speak, stopSpeaking, muted, toggleMute }}
    >
      {children}
    </AiraContext.Provider>
  );
}

export function useAira() {
  const ctx = useContext(AiraContext);
  if (!ctx) throw new Error("useAira must be used within an AiraProvider");
  return ctx;
}
