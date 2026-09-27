import { NextResponse } from "next/server";
import { Readable } from "stream";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export const runtime = "nodejs";

/**
 * Free neural text-to-speech for Aira's fallback voice — used whenever
 * there's no live HeyGen session (see lib/aira-context.tsx `speakFallback`).
 *
 * Calls the same free neural voice service Microsoft Edge's built-in "Read
 * Aloud" feature uses, via the open-source `msedge-tts` client. No API key,
 * no cost — but it's an unofficial endpoint (not a published public API), so
 * it can in principle change or go away without notice. The client always
 * falls back to the browser's own SpeechSynthesis voice if this route fails
 * or is unreachable, so Aira never goes silent.
 *
 * GET (not POST) so an <audio src> can hit it directly and stream the reply
 * as it arrives, rather than the client having to fetch()+blob() the whole
 * clip before playback can start — for a several-second line, that earlier
 * buffer-then-download round trip was the actual cause of the avatar
 * visibly lagging behind the response by multiple seconds. MP3 plays back
 * progressively, so the browser starts audio as soon as enough of the
 * stream has buffered, not after the whole thing lands.
 *
 * Default voice is "en-IN-NeerjaNeural" (Indian English, female); override
 * with AIRA_FREE_TTS_VOICE for a different Azure/Edge neural voice name.
 */
const VOICE = process.env.AIRA_FREE_TTS_VOICE || "en-IN-NeerjaNeural";
const MAX_TEXT_LENGTH = 3000;

export async function GET(req: Request) {
  const text = (new URL(req.url).searchParams.get("text") || "").trim();

  if (!text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: `Text too long (max ${MAX_TEXT_LENGTH} chars)` }, { status: 400 });
  }

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text);
    audioStream.on("close", () => tts.close());

    return new NextResponse(Readable.toWeb(audioStream) as ReadableStream<Uint8Array>, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "TTS synthesis failed" },
      { status: 502 }
    );
  }
}
