"use client";

import type { PointerEvent } from "react";
import { motion } from "framer-motion";
import { Mic, MessageCircle, StopCircle, Volume2, VolumeX } from "lucide-react";
import { useVoice } from "@/lib/voice-command-context";
import { useAira } from "@/lib/aira-context";
import { cn } from "@/lib/utils";

/**
 * A fixed, non-draggable pill toolbar pinned to the bottom of every screen.
 * "Hold to talk" is the default, primary action — press-and-hold (not a
 * tap) expands Aira to full screen (see aira-panel.tsx) and records for as
 * long as the button is held, resolving the full question only on release.
 * "Chat" is a
 * secondary, opt-in switch to a typed 50/50 split view (aira-chat-dock.tsx)
 * for when voice isn't convenient — never the default. A "stop" control
 * appears here (rather than on individual screens) whenever Aira is
 * actually talking, so it's available everywhere in the app, not just one
 * screen.
 */
export function AiraCtaBar() {
  const { supported, listening, mode, setMode, startHold, endHold, micError, callActive } = useVoice();
  const { isSpeaking, stopSpeaking, muted, toggleMute } = useAira();

  // Press-and-hold instead of tap-to-toggle: recognition only resolves once
  // the button is released, so a natural mid-sentence pause while the user
  // is still composing their question no longer gets mistaken for "done
  // talking" and answered on the first half of it (see startHold's comment
  // in voice-command-context.tsx).
  const handleHoldStart = (e: PointerEvent) => {
    e.preventDefault();
    // Without this, a touch that drifts slightly off the button's bounds
    // mid-hold (very easy to do by accident — a finger is rarely perfectly
    // still) fires pointerleave and ends the hold early, well before the
    // user meant to release. Capturing the pointer keeps every subsequent
    // event targeted at this button regardless of where the finger
    // physically is, so only a genuine lift-off (pointerup) ends it.
    (e.target as Element).setPointerCapture?.(e.pointerId);
    if (mode !== "talk") setMode("talk");
    startHold();
  };
  const handleHoldEnd = (e: PointerEvent) => {
    e.preventDefault();
    endHold();
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex flex-col items-center gap-2">
      {micError && (
        <span className="pointer-events-auto max-w-[85%] rounded-full bg-red-500/90 px-3 py-1.5 text-center text-[11px] font-medium text-white shadow-elevated">
          {micError}
        </span>
      )}
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-forest-950/90 p-1 shadow-elevated backdrop-blur">
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Unmute Aira" : "Mute Aira"}
          aria-pressed={muted}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium transition-colors",
            muted ? "bg-red-500/90 text-white" : "bg-forest-800 text-ivory-100 hover:bg-forest-700"
          )}
        >
          {muted ? <VolumeX className="h-4 w-4 shrink-0" /> : <Volume2 className="h-4 w-4 shrink-0" />}
        </button>
        {isSpeaking && (
          <button
            type="button"
            onClick={stopSpeaking}
            aria-label="Stop Aira talking"
            className="flex items-center gap-1.5 rounded-full bg-forest-800 px-3 py-2 text-[13px] font-medium text-ivory-100 hover:bg-forest-700"
          >
            <StopCircle className="h-4 w-4 shrink-0" />
          </button>
        )}
        {supported && (
          <button
            type="button"
            onPointerDown={handleHoldStart}
            onPointerUp={handleHoldEnd}
            onPointerLeave={handleHoldEnd}
            onPointerCancel={handleHoldEnd}
            aria-label={mode === "talk" && listening ? "Release to send" : "Hold to talk to Aira"}
            aria-pressed={mode === "talk" && listening}
            className={cn(
              "relative flex min-w-[112px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-medium leading-none transition-colors select-none touch-none",
              mode === "talk" && listening ? "bg-red-500 text-white" : "bg-forest-800 text-ivory-100"
            )}
          >
            {mode === "talk" && listening && (
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-red-400"
                animate={{ opacity: [0.7, 0, 0.7], scale: [1, 1.3, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
            <Mic className="h-4 w-4 shrink-0" />
            <span className="shrink-0">{mode === "talk" && listening ? "Listening…" : "Hold to talk"}</span>
          </button>
        )}

        {/* Screen02BuyerProfile already presents Aira as a full-screen "video
            call" for its 3 profiling questions, with its own answer-by-voice
            or tap-a-chip flow — a separate typed chat mode doesn't add
            anything there and would just be a redundant second way in. */}
        {!callActive && (
          <button
            type="button"
            onClick={() => setMode("chat")}
            aria-label="Chat with Aira instead"
            aria-pressed={mode === "chat"}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors",
              mode === "chat" ? "bg-gold-500 text-forest-950" : "bg-forest-800 text-ivory-100"
            )}
          >
            <MessageCircle className="h-4 w-4 shrink-0" />
            Chat
          </button>
        )}
      </div>
    </div>
  );
}
