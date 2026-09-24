## Premium Sales Brain update

The POC now uses the OpenAI Responses API with `gpt-5.4-mini` by default for a lower-cost POC while retaining structured outputs, reasoning, RAG and function-calling compatibility. Keep `OPENAI_API_KEY` server-side. Structured Outputs drive the UI, including optional `videoTrigger` actions for the interactive walkthrough.

The walkthrough context is exposed to the sales engine so the avatar can ask one relevant question at a time. When the agent decides an approved feature video is useful, the response contains `videoTrigger`; the walkthrough listens for that event and plays the matching clip.

Add approved project-specific clips under `public/videos/` using the IDs in `lib/sales-agent/prompt.ts`. Do not use generic or unapproved clips for future-development or investment claims.

# HoABL AI Land Advisor — Aira (Prototype)

An interactive, mobile-first product prototype for HoABL's AI-guided land decision
experience. This is **not** a property marketplace — it is a 14-screen guided journey
where "Aira," an AI land advisor, takes a post-sales-call customer from understanding
a project through pocket selection, trade-off comparison, and decision confidence,
before handing off to a human HoABL advisor with full context.

This is a **clickable demo**. No real payments, no real KYC submission, no real land
purchase — everything is simulated with local, in-memory state.

## 1. What was built

The complete 14-screen golden path, in the required order, all with working CTAs and
no dead ends:

1. Welcome (after sales call)
2. AI buyer profile (conversational, not a form)
3. Buyer profile summary
4. AI project match ("Aira recommends Project X")
5. Project walkthrough (7 guided sections: location, connectivity, development vision,
   amenities, land layout, pocket logic, things to consider)
6. Land layout & preview (locked plot-level detail, pre-token)
7. ₹45,000 refundable token + mock KYC
8. Simulated KYC/payment success → access unlocked
9. AI pocket finder (choose up to 3 preferences)
10. AI pocket map (My matches / All pockets / Infrastructure tabs, legend, tappable pockets)
11. Pocket detail (profile suitability score, strengths, trade-offs, trust labels)
12. Compare pockets (2–3 side by side, Aira's transparent take)
13. Decision confidence (+ concern flow + decision summary)
14. Human advisor handoff (auto-shared context, no "please repeat yourself")

Also built:

- **A persistent, always-on Aira** (`lib/aira-context.tsx` + `components/aira-panel.tsx`)
  — one HeyGen LiveAvatar session for the whole journey (never torn down/reconnected
  between screens), presented as a draggable vertical card the user can move anywhere
  on screen, with a live/connecting/fallback status pill, a speaking-ring animation,
  and a caption line. Every screen just calls `useAira().speak("...")` — Aira genuinely
  narrates the journey rather than sitting in a one-off card per screen.
- **Voice input** (`lib/voice-command-context.tsx`): tap the avatar card to talk (Web
  Speech API — free, browser-native, no HeyGen credits involved). Every screen
  registers what it can respond to — an option's label selects it, "continue"/"next"
  advances, multi-select screens accept "done" to submit — so the whole 14-screen
  journey is navigable by voice alone. Falls back invisibly (mic affordance hidden) in
  browsers without speech recognition support (Safari, Firefox).
- **A real chat-style buyer profile** (screen 2): a scrolling message thread with
  typing indicators and bubbles, not a step-by-step form — Aira asks, you tap a chip,
  your answer appears as a chat bubble, Aira "types" the next question.
- A **trust layer** (`components/trust/*`): `TrustBadge`, `VerifiedInfo`,
  `AIInterpretation`, `ConfirmWithHoabl` — used throughout so Aira never sounds more
  certain than the underlying (fictional, demo) data actually is.
- A deterministic **profile-suitability scoring engine** (`lib/recommendation.ts`) —
  explicitly labeled "profile suitability," never a financial prediction.
- **Sales-engine / demand signals** (`components/urgency-badge.tsx`,
  `lib/urgency.ts`): a "Only N plots left" badge driven by each pocket's real
  `availability`/`plotsLeft` state (not fabricated), a gently-ticking "N viewing now"
  demo signal, a reservation countdown on the token/KYC screen, and a demand banner on
  the land-layout preview — tasteful pressure, not casino-style urgency.
- 8 fictional demo pockets across 4 zones with price, size, access, privacy, amenity
  proximity, view, trade-offs and verified facts (`lib/data.ts`).
- A lightweight **analytics abstraction** (`lib/analytics.ts`) logging every event in
  the funnel from `sales_call_completed` through `advisor_handoff_clicked`.
- A discreet **Demo Mode** control (bottom-right gear icon) with **Reset demo**.
- Desktop presentation: a centered phone-frame view of the mobile app with journey
  context alongside it; the phone-first UI expands full-bleed below `lg` breakpoint.

## 2. How to run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000 (Next.js will pick the next free port if 3000 is busy).

To build for production:

```bash
npm run build
npm run start
```

> **Windows/PowerShell users:** if your shell has `NODE_ENV` permanently set to
> `production` (some environments do), `next dev` will misbehave (Tailwind won't
> compile). If you see a 500 error mentioning `globals.css`, run:
> `$env:NODE_ENV = 'development'; npm run dev` (PowerShell) or
> `NODE_ENV=development npm run dev` (bash).

## 3. Environment variables

Copy `.env.local.example` to `.env.local`:

```
HEYGEN_API_KEY=
HEYGEN_AVATAR_ID=
HEYGEN_SANDBOX=true
```

All are optional. The app runs fully without them (Aira falls back to the local
animated portrait). **Note both vars are server-only (no `NEXT_PUBLIC_` prefix) — see
below for why, and for where each value comes from.**

## 4. How the HeyGen integration works

Aira is powered by **HeyGen's LiveAvatar Web SDK** (`@heygen/liveavatar-web-sdk`,
https://docs.liveavatar.com) — the actively-maintained product HeyGen has been
migrating developers to (the older "Interactive Avatar" `@heygen/streaming-avatar`
package is deprecated and, as of this build, ships with no actual code on npm, so it
was not usable).

**Where credentials come from:** create an avatar and grab an API key at
https://app.liveavatar.com/developers — **this is a different dashboard/account than
the classic app.heygen.com Enterprise streaming API**, so a key from there won't work
here. `HEYGEN_AVATAR_ID` is the UUID of the avatar you create in that dashboard.

**Why no `NEXT_PUBLIC_` vars:** both the API key and avatar id are read only inside
`app/api/heygen/token/route.ts`, a server route. On mount, the client
(`lib/aira-context.tsx`) calls that route, which does:

```
POST https://api.liveavatar.com/v1/sessions/token
headers: { "X-API-KEY": HEYGEN_API_KEY }
body:    { mode: "FULL", avatar_id: HEYGEN_AVATAR_ID, is_sandbox }
```

and returns only the resulting short-lived `session_token` to the browser — the real
key never ships in client JS. The client then does:

```ts
const session = new LiveAvatarSession(sessionToken);
session.on(SessionEvent.SESSION_STREAM_READY, () => session.attach(videoEl));
await session.start();
session.repeat("text for Aira to say");   // called from useAira().speak()
await session.stop();                     // on unmount
```

We request `mode: "FULL"` but deliberately omit `llm_configuration_id` — Aira's
"brain" here is this app's own scripted screen content, not a HeyGen-hosted LLM
agent; we only use the session to puppet the avatar's video/voice via `.repeat(text)`,
relying on the avatar's built-in default voice for text-to-speech.

**Note:** an earlier version of this integration used `mode: "LITE"`, which looked
right (no agent config needed, simplest option) but is actually the wrong choice for
this use case — LiveAvatar's own docs describe LITE mode as "you handle the
conversational orchestration — STT, LLM, TTS" (bring your own ElevenLabs/OpenAI/Gemini
voice pipeline). With no such pipeline attached, `.repeat(text)` sent successfully with
zero errors but produced no audio at all (confirmed by measuring the actual WebRTC
audio track). `FULL` mode is the one with a documented "default avatar voice" used
automatically when no `voice_id` is set — that's what actually produces speech.

If the token route 501s (no key configured) or the session fails to connect for any
reason, `lib/aira-context.tsx` catches it and flips to `status: "fallback"` — the
persistent `<AiraPanel />` then shows the local animated portrait instead. The app
never breaks without HeyGen credentials, and every screen calls the same
`useAira().speak(text)` regardless of which mode is active.

Credentials are never hardcoded — they only ever come from `process.env.HEYGEN_API_KEY`
/ `process.env.HEYGEN_AVATAR_ID`, read server-side only.

## 5. Where mock KYC/payment logic lives

Both live entirely client-side in
`components/screens/screen-07-token-kyc.tsx`:

- **KYC**: a local form (`fullName`, `pan`, `aadhaar`, `dob`, `mobile`, `email`) with
  regex-based mock validation (PAN: `ABCDE1234F` pattern, Aadhaar: 12 digits) and a
  "Selfie verification" button that just flips a boolean — labeled "Verification
  simulated." Nothing is sent anywhere.
- **Payment**: a method picker (UPI / Net Banking / Card) with a "Pay ₹45,000 →"
  button. Clicking it dispatches `SET_KYC: verified` and `SET_PAYMENT: processing`,
  then advances to `screen-08-access-unlocked.tsx`, which runs a timed sequence (KYC
  verification → Payment processing → Payment successful → Access unlocked) purely
  with `setTimeout` and local component state, then marks `SET_PAYMENT: completed`.
- Every payment/KYC screen is explicitly labeled "Demo transaction" / "Prototype/demo"
  in the UI.

Journey-wide state (buyer profile, KYC/payment status, shortlist, comparisons,
concerns, confidence, etc.) lives in `lib/journey-context.tsx`, a single React
Context + `useReducer` — intentionally dependency-free for a POC of this size.

## 6. Replacing mock payment with a real provider later

1. Swap the `pay()` handler in `screen-07-token-kyc.tsx` for a real checkout call
   (e.g. Razorpay order creation via a server route you'd add under `app/api/`).
2. Replace the client-only `SET_PAYMENT`/`SET_KYC` dispatches with state driven by
   webhook/callback confirmation instead of a local timer.
3. Keep `screen-08-access-unlocked.tsx`'s UI (the step sequence) — just drive its
   `stepIdx` from real async status instead of the demo `setTimeout` loop.
4. Route KYC data server-side to your actual KYC provider (e.g. Digilocker/PAN
   verification APIs) instead of the local regex checks.

## 7. How analytics events are structured

`lib/analytics.ts` exports `track(event, properties?)`. Every event is timestamped
and pushed into an in-memory log (`getEvents()`), and also `console.log`'d in the
browser so you can watch the funnel live while clicking through the demo. The full
event vocabulary (from `sales_call_completed` to `advisor_handoff_clicked`) is typed
as the `AnalyticsEvent` union, so adding a new event is a one-line type change.

To go to production analytics, replace the body of `track()` with a call to
PostHog/GA/Segment — every call site in the screens stays the same.

## Known npm audit findings

`npm audit` will report a couple of high/critical advisories against `next@14.2.35`
(self-hosted server-side issues — image optimizer, request smuggling, etc. — see
https://nextjs.org/blog/security-update-2025-12-11) and its bundled `postcss`. Fixing
them requires a Next.js 15/16 major upgrade, which is out of scope for this POC (it
would touch App Router internals across all 14 screens). Not a concern for local
`npm run dev` use; flag before any real deployment.

## Design notes

- Palette: deep forest green (`forest-*`), warm ivory (`ivory-*`), and a restrained
  gold accent (`gold-*`) — defined in `tailwind.config.ts`.
- The trust layer is the most important structural idea in this prototype: every
  Aira claim is tagged **Verified**, **Aira's interpretation**, or **Confirm with
  HoABL** — Aira is never allowed to sound more certain than the underlying (demo)
  data.
- All project/pocket data in `lib/data.ts` is explicitly fictional demo content.

## Sales AI Agent POC — Groq + multi-project RAG

The existing HeyGen LiveAvatar layer is retained. Free-form voice/text input that is not consumed by a screen-specific navigation command is routed to `/api/sales-agent`, which calls the server-side Groq API. Project knowledge is retrieved from the multi-project RAG layer before the Groq response is generated.

The old scripted QA fallback is intentionally disabled for the Sales Agent path. If Groq is unavailable, the app reports the connection problem instead of silently speaking a pre-fed answer.

### 1. Install Groq on Windows

Install the official Groq Windows application. Groq runs natively on Windows and exposes its local API at `http://localhost:11434`.

PowerShell option:

```powershell
ir -useb https://Groq.com/install.ps1 | iex
```

Or download the Windows installer from https://Groq.com/download/windows.

### 2. Install the local Sales Agent model

For this POC use Qwen3 4B:

```powershell
Groq pull qwen3:4b
```

Test it:

```powershell
Groq run qwen3:4b
```

Type `Hello` and confirm that the model responds. Type `/bye` to exit.

### 3. Configure the Next.js app

Copy `.env.local.example` to `.env.local` and use:

```env
GROQ_API_KEY=your_key_here
GROQ_MODEL=openai/gpt-oss-20b
```

Keep your existing HeyGen variables in the same `.env.local`.

### 4. Install project dependencies

```powershell
npm install
```

### 5. Start Groq

The Windows Groq app normally runs the local service in the background. If it is not running, start it with:

```powershell
Groq serve
```

### 6. Verify Groq before starting Next.js

```powershell
Groq list
```

You should see `qwen3:4b`. Then test the API:

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:11434/api/chat `
  -ContentType 'application/json' `
  -Body (@{
    model = 'qwen3:4b'
    messages = @(@{ role = 'user'; content = 'Say hello in one sentence.' })
    stream = $false
    think = $false
  } | ConvertTo-Json -Depth 5)
```

### 7. Start the POC

```powershell
npm run dev
```

The flow is now:

```text
Customer voice
    ↓
Browser SpeechRecognition
    ↓
/api/sales-agent
    ↓
Local Groq / Qwen3
    ↓
Sales Agent JSON
    ↓
Aira `speak()`
    ↓
Existing HeyGen LiveAvatar
```

The Sales Agent uses the supplied calling script as its approved playbook/product knowledge and maintains conversation state for objective, configuration, decision makers, objections, scheduling, interest, and sales stage.

## Multi-project RAG — embeddings + Qdrant

The Sales Agent now supports semantic retrieval instead of relying only on keyword matching. Project PDFs and FAQs are chunked, embedded with Gemini Embeddings, stored in Qdrant, and retrieved by `projectId` before the Groq response is generated. Gemini documents embeddings as a retrieval use case, and Qdrant stores vectors with payload metadata and supports filtered nearest-neighbor queries.

### Architecture

```text
Project PDF / FAQ
      ↓
Chunking
      ↓
Gemini Embedding
      ↓
Qdrant vector DB
      ↓
Customer question
      ↓
Gemini query embedding
      ↓
Qdrant search filtered by projectId
      ↓
Relevant project chunks
      ↓
Groq Sales Agent
      ↓
Existing HeyGen avatar
```

### 1. Create Qdrant

Create a Qdrant Cloud cluster and copy its URL and API key. A self-hosted Qdrant URL also works.

Set:

```env
GEMINI_API_KEY=
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
GEMINI_EMBEDDING_DIMENSIONS=768

QDRANT_URL=https://YOUR-CLUSTER.qdrant.io
QDRANT_API_KEY=YOUR_QDRANT_KEY
QDRANT_COLLECTION=hoabl_sales_knowledge

INGESTION_SECRET=choose-a-private-secret
```

Keep all of these server-side. Never prefix them with `NEXT_PUBLIC_`.

### 2. Install the PDF parser

```powershell
npm install
```

The project uses `pdf-parse` only in the server-side PDF ingestion route.

### 3. Seed the existing project registry

Start Next.js:

```powershell
npm run dev
```

Then:

```powershell
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3000/api/knowledge/seed" `
  -Headers @{ "x-ingestion-secret" = "YOUR_INGESTION_SECRET" }
```

This converts the existing approved project registry facts into embeddings so the POC works immediately with vector retrieval.

### 4. Ingest a project PDF

```powershell
$form = @{
  projectId = "isle-of-anjarle"
  section = "project"
  file = Get-Item "C:\path\to\anjarle-brochure.pdf"
}

Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3000/api/knowledge/ingest/pdf" `
  -Headers @{ "x-ingestion-secret" = "YOUR_INGESTION_SECRET" } `
  -Form $form
```

Response example:

```json
{
  "ok": true,
  "projectId": "isle-of-anjarle",
  "source": "anjarle-brochure.pdf",
  "pages": 12,
  "chunks": 24,
  "dimensions": 768
}
```

### 5. Ingest FAQs

```powershell
$body = @{
  projectId = "isle-of-anjarle"
  faqs = @(
    @{
      question = "What amenities are available?"
      answer = "Use the approved project amenities information."
      section = "amenities"
    },
    @{
      question = "What future infrastructure is planned nearby?"
      answer = "Use only the verified future-development information supplied by HoABL."
      section = "futureDevelopment"
    }
  )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3000/api/knowledge/ingest/faq" `
  -Headers @{ "x-ingestion-secret" = "YOUR_INGESTION_SECRET"; "Content-Type" = "application/json" } `
  -Body $body
```

### 6. Runtime retrieval

`POST /api/sales-agent` keeps the existing request and response shape. The only internal change is that `retrieveProjectKnowledge()` now embeds the customer question and performs a Qdrant vector search filtered by the active `projectId`.

If Qdrant/Gemini retrieval is temporarily unavailable, the POC falls back to the existing project registry keyword retrieval instead of breaking the avatar demo. Once project documents are ingested, semantic results are used first.

### 7. Adding another HoABL project

You do not create a new Sales Agent. Add the project ID/name/aliases to the registry, then ingest its approved PDFs and FAQs:

```text
Project A PDFs + FAQs → Qdrant → projectId=A
Project B PDFs + FAQs → Qdrant → projectId=B
Project C PDFs + FAQs → Qdrant → projectId=C
```

The same Sales Agent uses the active project filter, so information from one project is not retrieved for another project.


## Project setup

The app is multi-project and routes Sales Agent context by `projectId`. The current catalog is defined in `lib/data.ts`, while approved sales knowledge is defined in `lib/sales-agent/projects/registry.ts`.

For each real project, add its approved brochure/FAQs through the ingestion endpoints instead of copying another project's brochure. The ingestion endpoints attach the selected `projectId` to every vector, so retrieval stays isolated per project.

Recommended structure for production project assets:

```text
public/projects/<project-id>/
  brochure.pdf
  videos/
    location.mp4
    connectivity.mp4
    nearby-development.mp4
    future-development.mp4
    amenities.mp4
    investment.mp4
    payment-options.mp4
```

Do not use illustrative pricing, availability, future-development claims, or another project's brochure as a real project's knowledge. Until a project's approved brochure/FAQ is ingested, the agent should say that the detail needs confirmation rather than inventing it.

### POC model

```env
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-5.4-mini
OPENAI_REASONING_EFFORT=low
```

`gpt-5.4-mini` supports Responses API, streaming, function calling and structured outputs, and is priced at $0.75/M input tokens and $4.50/M output tokens.


## POC setup (important)

For the sales conversation POC, you only need `OPENAI_API_KEY`. The default model is `gpt-5.4-mini`. Gemini embeddings and Qdrant are optional. If `GEMINI_API_KEY` or `QDRANT_URL` is missing, the Sales Agent automatically uses the local project registry instead of attempting vector retrieval.

The `/api/sales-agent` route uses the raw Responses API with `fetch()`. It extracts structured text from `output[].content[]`; it does not assume the SDK-only `output_text` helper exists.

Current project selection is preserved from the UI. If a request arrives without a project id, the route falls back to the Aero Estate project package rather than sending an empty project context to the model.
