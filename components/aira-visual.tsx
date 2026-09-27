"use client";

import { useEffect, useRef, useState } from "react";
import { useAira } from "@/lib/aira-context";
import { cn } from "@/lib/utils";

const FORWARD_SRC = "/Real_estate_advisor_talking_20260927203735.mp4";
// Same clip played backwards (generated with `ffmpeg -vf reverse`), used to
// boomerang the loop — see the comment on AiraPortrait for why.
const REVERSED_SRC = "/avatar-talking-reversed.mp4";

/**
 * The raw video-or-portrait content for Aira's avatar. Registers its own
 * <video> element with the shared HeyGen session (see lib/aira-context.tsx),
 * so more than one AiraVisual can be on screen at once (e.g. the persistent
 * header panel and a screen's larger hero avatar) and both show the same
 * live feed.
 */
export function AiraVisual({ className }: { className?: string }) {
  const { status, isSpeaking, attachVideo, detachVideo } = useAira();
  const videoEl = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoEl.current;
    if (status === "live" && el) attachVideo(el);
    return () => detachVideo(el);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (status !== "live") {
    return <AiraPortrait className={className} isSpeaking={isSpeaking} />;
  }

  return <video ref={videoEl} autoPlay playsInline className={className ?? "h-full w-full object-cover"} />;
}

/**
 * Free fallback avatar: a pre-recorded talking-head clip, muted (it has its
 * own baked-in narration audio, which would talk over the actual TTS voice —
 * see lib/aira-context.tsx). Its playback is driven by `isSpeaking` rather
 * than looping unconditionally, so the clip is only in motion for exactly as
 * long as Aira is actually talking, and holds on its first frame the rest of
 * the time instead of visibly "talking" over silence.
 *
 * The clip's own first and last frames don't quite match, so a plain `loop`
 * attribute produced a visible jump-cut every ~10s for any line that ran
 * longer than one play-through. Instead this boomerangs between the clip
 * and a pre-rendered reverse of the same clip: forward plays to its last
 * frame, the reverse picks up from exactly that frame and plays back to the
 * first, forward picks up from exactly *that* frame, and so on — every
 * hand-off starts on the frame the previous one ended on, so there's never
 * a cut, for however long the current line's real TTS audio actually runs.
 */
export function AiraPortrait({ className, isSpeaking = false }: { className?: string; isSpeaking?: boolean }) {
  const forwardRef = useRef<HTMLVideoElement>(null);
  const reversedRef = useRef<HTMLVideoElement>(null);
  const [showForward, setShowForward] = useState(true);

  useEffect(() => {
    const forward = forwardRef.current;
    const reversed = reversedRef.current;
    if (!forward || !reversed) return;

    reversed.pause();
    reversed.currentTime = 0;
    setShowForward(true);

    if (isSpeaking) {
      forward.currentTime = 0;
      forward.play().catch(() => {});
    } else {
      forward.pause();
      forward.currentTime = 0;
    }
  }, [isSpeaking]);

  const handleForwardEnded = () => {
    const reversed = reversedRef.current;
    if (!isSpeaking || !reversed) return;
    setShowForward(false);
    reversed.currentTime = 0;
    reversed.play().catch(() => {});
  };

  const handleReversedEnded = () => {
    const forward = forwardRef.current;
    if (!isSpeaking || !forward) return;
    setShowForward(true);
    forward.currentTime = 0;
    forward.play().catch(() => {});
  };

  return (
    <div className={cn("relative overflow-hidden bg-forest-950", className)}>
      <video
        ref={forwardRef}
        src={FORWARD_SRC}
        muted
        playsInline
        preload="auto"
        onEnded={handleForwardEnded}
        className={cn("absolute inset-0 h-full w-full object-cover", !showForward && "opacity-0")}
      />
      <video
        ref={reversedRef}
        src={REVERSED_SRC}
        muted
        playsInline
        preload="auto"
        onEnded={handleReversedEnded}
        className={cn("absolute inset-0 h-full w-full object-cover", showForward && "opacity-0")}
      />
    </div>
  );
}
