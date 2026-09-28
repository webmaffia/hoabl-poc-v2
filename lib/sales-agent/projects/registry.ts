import { PROJECT, PROJECTS } from "../../data";
import type { ProjectKnowledgePackage } from "./types";

/**
 * Project knowledge registry.
 *
 * Add a project package here when its approved sales material is available.
 * The generic catalog entries below intentionally contain only the project
 * name/location/description already present in the app; pricing and other
 * details in the demo UI are not promoted into sales knowledge unless marked
 * as approved facts.
 */
export const PROJECT_KNOWLEDGE: Record<string, ProjectKnowledgePackage> = {
  "isle-of-anjarle": {
    id: "isle-of-anjarle",
    name: "Isle of Anjarle — The Grand Sea Land Finale",
    aliases: ["anjarle", "isle of anjarle", "grand sea land finale"],
    location: "Anjarle, North Ratnagiri district, Konkan coast, Maharashtra",
    summary: "Sea × Hill branded land development on the Konkan coast.",
    verifiedFacts: [
      "100+ acres",
      "7-star master plan",
      "Designed by Sanjay Puri",
      "Hospitality by Miros",
      "Konkan's largest clubhouse inaugurated 21 March 2026",
      "Possession by end of 2026",
      "MahaRERA registered"
    ],
    // Sourced from client-supplied documents dated 16.09.2026: the Isle of
    // Anjarle Opportunity Doc, Closing Deck, Travel Guide, an independent
    // Liases Foras research report, and the three post-mop-up calling
    // scripts (DST/inbound/outbound). Kept as short, independently
    // retrievable facts rather than long paragraphs, matching how
    // retrieveProjectKnowledge() scores and returns individual chunks.
    sections: {
      project: [
        "100+ acres, master-planned hillside estate overlooking the Arabian Sea.",
        "7-star master plan designed by Sanjay Puri.",
        "Hospitality by Miros Hotels, Resorts & Palaces.",
        "Konkan's largest clubhouse, 20,000 sq.ft., inaugurated 21 March 2026.",
        "Possession by end of 2026.",
        "Development lifecycle stage: project inception, cluster curation and key amenities are complete; currently at pre-possession, moving toward handover to landowners.",
        "The project is being developed in phases under codenames TomorrowView, Tomorrowworld/Tomorrowland, and The Ridley — see the legal section for exact MahaRERA numbers per phase."
      ],
      configurations: [
        "1,367 sq.ft. — ₹39.99 lakhs — sold out.",
        "1,506 sq.ft. — ₹43.99 lakhs — sold out.",
        "2,002 sq.ft. (186 sq.m.) — ₹61.94 lakhs all-inclusive — available.",
        "2,723 sq.ft. (253 sq.m.) — ₹83.87 lakhs all-inclusive — available.",
        "CAM (common area maintenance) and corpus fund are extra, on top of the listed price.",
        "₹61.94 lakhs for 2,002 sq.ft. and ₹83.87 lakhs for 2,723 sq.ft. are the current, confirmed prices (per the 16.09.2026 Closing Deck) — state these directly and confidently, they do not need re-verification.",
        "Larger configurations are positioned as the stronger choice: lower price-per-sq.ft., genuine villa-build potential, and higher premiums in the weekend rental market."
      ],
      payment: [
        "Booking Amount 1 (Expression of Interest): ₹99,000, fully refundable, secures priority plot allocation.",
        "Booking Amount 2 (on allocation): 9.9% of price minus BA1.",
        "SDR/Milestone 2 (60 days from BA2): 15.1% of price.",
        "Milestone 3 (15 June 2026): 20% of price.",
        "Milestone 4 (15 August 2026): 20% of price.",
        "Milestone 5 (15 October 2026): 20% of price.",
        "Final milestone (15 December 2026): 15% of price.",
        "Financing/loan option of up to 50% is available.",
        "This project's Expression of Interest is ₹99,000 — the demo app's token-payment screen shows this exact amount for Isle of Anjarle (other projects in the demo still use a generic ₹45,000 placeholder).",
        "Immediate process after Expression of Interest: Day 3 allocation call (plot selection), Day 7 BA2 payment and documentation, Day 10 welcome/onboarding call.",
        "The booking amounts and milestone schedule above are confirmed — only a customer's personal EMI/financing eligibility needs individual confirmation at KYC."
      ],
      location: [
        "Anjarle lies in North Ratnagiri district, at the mouth of the Jog River where it meets the Arabian Sea.",
        "Nine untouched beaches line the coastline; three — Ridley's Beach (Anjarle Beach), Padale Beach, and Savane Beach — are right at the site.",
        "A rare Sea × Hill geography, occurring on less than 0.1% of India's ~11,098 km coastline, and protected under CRZ (Coastal Regulation Zone) norms.",
        "Distance from Mumbai: ~225 km, ~5.5 hours currently, ~3–4 hours post infrastructure upgrades.",
        "Distance from Pune: ~180 km, ~4.5 hours currently, ~3.5 hours post infrastructure upgrades.",
        "Nearest urban service town: Dapoli, ~24.3 km / ~45 min by road — primary road link to Anjarle.",
        "Nearest administrative centre and rail hub: Khed, ~53.8 km / ~2 hours by road — Khed railway station is the primary rail link for the region.",
        "UNESCO-recognised biodiversity hotspot with 300+ species of flora and fauna, one of 8 such hotspots in the world.",
        "Nesting ground for Olive Ridley sea turtles, with humpback dolphin sightings off nearby Harnai."
      ],
      connectivity: [
        "NH 66 (Mumbai–Goa Highway): being upgraded to a 4-lane divided highway; independent Liases Foras research puts it at ~470 km length and ~92% of the upgrade complete, expected to cut travel time by 30–40%.",
        "Konkan Marine Expressway: a 6-lane expressway, ₹26,000 crore investment by MSRDC, currently at the land-acquisition stage per Liases Foras; expected to cut travel time by 50–60% once complete. Its exact length is cited inconsistently across sources (376 km per Liases Foras vs 466–498 km elsewhere) — confirm before quoting a figure.",
        "Konkan Coastal Road / Sagari Mahamarg (MSH-4): an operational ~400 km network of coastal roads passing through Anjarle — India's answer to California's Pacific Coast Highway.",
        "Mumbai–Madgaon Vande Bharat Express: brings Anjarle within a ~4-hour transit window from Mumbai CSMT via Khed station.",
        "Mumbai–Ratnagiri Ro-Ro ferry: operational since September 2025; ~4 hours to Sindhudurg, a tourism multiplier for the region.",
        "Navi Mumbai International Airport (NMIA): commenced operations December 2025; reduces the domestic/international air-travel catchment for Anjarle/Dapoli from ~5+ hours (via CSMIA) to ~3 hours.",
        "MTHL / Atal Setu (Mumbai Trans Harbour Link): reduces travel time from Mumbai to the start of the Konkan corridor by ~45–60 minutes by bypassing the Vashi bridge route.",
        "Mumbai and Pune together represent 35+ million urban residents — India's largest combined demand base for second homes."
      ],
      futureDevelopment: [
        "2025: NMIA operations commenced (December); Mumbai–Ratnagiri Ro-Ro ferry became operational (September).",
        "2026: Konkan Marine Expressway construction stage begins (March); NH 66 upgrade completion targeted (March).",
        "2027: a 20%+ increase in tourism footfall is projected from smoother NH 66 access and expanded air access.",
        "2034: a mature infrastructure ecosystem is projected to support over 1 million annual tourists.",
        "These are projected milestones only — present them as projections, not confirmed government timelines, and never invent any dates, projects or outcomes beyond what's listed here."
      ],
      amenities: [
        "Grand clifftop clubhouse: 20,000 sq.ft., positioned ~300 ft above sea level, inaugurated 21 March 2026 — Konkan's largest and among India's highest clifftop clubhouses.",
        "Clubhouse facilities: restaurant/café, party lounge, infinity pool, lap pool, jacuzzi, indoor gym, indoor games room, guest rooms, spa, fully-serviced kitchen.",
        "30+ amenities across the estate, including: treehouses, viewing deck, hangout spaces, party lawns, yoga zones, open-air theatre, aqua zone, outdoor gym, outdoor spa, multipurpose hall, indoor dining & barbecue, skating rink, swinging pavilions, ziplining, rock climbing, herbal/organic gardens, flower nursery, a dedicated pet zone, and community-farming plots.",
        "Additional amenities: amphitheatre, cabanas, bonfire pit, coastal suites, senior citizens' sitout, stargazing zone, reflexology path.",
        "Hospitality is run by Miros Hotels, Resorts & Palaces, helmed by Ranvir Bhandari (prior experience at Oberoi Hotels & Resorts, ITC Hotels, and Soneva), offering 24/7 concierge, in-residence spa, wellness programme, private event planning and catering, curated leisure/travel experiences, and full-service housekeeping."
      ],
      architecture: [
        "Designed by Sanjay Puri Architects (founded 1992 by Ar. Sanjay Puri).",
        "The firm's recognitions: Top 100 architectural firms (World Architecture Community, UK), #32 on Archello's Top 100 architects worldwide, Top 100 Architects Worldwide (Archdaily), Top 130 design firms worldwide (Architizer, New York).",
        "Selected prior works: The Trinity (Montenegro), The Park (Mumbai), ISKCON (Ahmedabad), The Courtyard (Raipur), Gulf of Goa (Vasco), Auriga (Mumbai), Narsighar (Rajasthan), Origami House (Pune), Courtyards House (Rajasthan).",
        "Design philosophy: architecture follows the land's own topography, with no design ever repeated across projects."
      ],
      investment: [
        "Cited estimate: 3–4X Konkan land appreciation over the last decade, with projections of up to 5X by 2035.",
        "Cited rental yield potential: 15%+ for Anjarle vs. ~2–3% for metro residential (source: LiasesForas, via the Closing Deck).",
        "Independent research firm Liases Foras (a non-broking real estate research company) cites international consultants valuing Anjarle land at ₹4,000+ per sq.ft. today — present this as a third-party valuation estimate, not a current transacted price.",
        "Liases Foras compares Anjarle's land-price growth trajectory against other Indian cliff/coastal destinations (Yarada, Vagator, Gokarna, Karwar, Varkala) with cited multiples in the 2.5x–3.5x range; which exact multiple applies to Anjarle itself isn't clearly labeled in the source chart, so don't attribute a specific one to Anjarle without confirming first.",
        "Liases Foras separately cites nearby coastal villages' current land rates in a ~₹250–₹2,000 per sq.ft. range, with a ~246% forecast rise over the next 5 years for the region — the exact village-to-rate mapping isn't reliably available, so treat specific per-village figures as needing confirmation.",
        "Liases Foras illustrative return model for a premium 3BHK villa built on this land (not the bare plot itself): ~₹2.25 Cr average villa cost, ~55% average annual occupancy, ~₹18,000/night average rate, ~15% rental yield, ~53% ROI by year 10, with 100% of initial investment modeled as recovered by year 4. Present this as an illustrative model contingent on building a villa, never as a guaranteed return on the plot alone.",
        "Footfall projection (source: Colliers International, via the Closing Deck): from ~5.22 lakh, to ~7.68 lakh, to 11 lakh+ annual footfalls by 2035 (a 3.4X increase).",
        "Accommodation tariff data: 1BHK villas ~₹2,500–3,000/night (~₹6,000–7,000 with sea/hill view); 3BHK premium villas ~₹18,000–22,000/night.",
        "Present all of the above confidently as the real, cited investment case for this project — but always as estimates/projections from named sources, never as guaranteed outcomes, and never invent additional statistics beyond what's listed here."
      ],
      developer: [
        "The House of Abhinandan Lodha (HoABL) was established in 2020 and is NOT affiliated, in any manner, with Lodha or Lodha Group — use this exact disclaimer if a customer asks about the Lodha name.",
        "Scale (developer-wide, not project-specific): 6,500+ customers across 27 countries; 13+ million sq.ft. of land sold; 34+ million sq.ft. under development.",
        "Location count is cited inconsistently across sources — the Closing Deck states 23+ states / 107+ cities / 8+ locations, while a calling script states '16 locations'. Confirm the current figure rather than picking one.",
        "Other HoABL branded land developments: Bicholim, Goa (130+ acre, the only such development with a man-made sea and beach); Ayodhya, UP (50+ acre, near Ram Temple, with a Leela Palace hotel on-premise); Khopoli, Maharashtra (50-acre, 30,000 sq.ft. hilltop boutique resort); Alibaug, Maharashtra (chosen by public figures including Mr. Amitabh Bachchan and Ms. Kriti Sanon — present this only as a stated claim, never as an implied endorsement or guarantee of similar outcome)."
      ],
      legal: [
        "The project is being developed in phases, each separately MahaRERA-registered: TomorrowView (P52800050210); Tomorrowworld – Tomorrowland Phase IV (P52800047713); The Ridley (P52800076609); The Ridley Phase-2 (PP1281012400069); Codename Tomorrowland Ph-1 (P52800031035), Ph-2 (P52800031036), Ph-3 (P52800033162).",
        "These registrations can be verified at https://maharera.mahaonline.gov.in/ — always point the customer to verify independently rather than asserting registration status yourself.",
        "Which specific phase/RERA number applies to a customer's chosen configuration isn't specified yet — this gets confirmed at KYC/booking.",
        "CRZ (Coastal Regulation Zone) compliance is stated for this project — restate this directly, but don't offer your own legal interpretation of CRZ status beyond that."
      ],
      travelGuide: [
        "From Mumbai: Mumbai – Panvel – Mangaon – Khed – Dapoli – Anjarle via NH 66, ~230–240 km, ~5–6 hours.",
        "From Navi Mumbai International Airport (NMIA): ~200–220 km, ~4.5–5.5 hours — the closest aviation gateway to the Konkan coast.",
        "From Pune: via Tamhini Ghat – Mangaon – Khed – Dapoli – Anjarle, ~215–230 km, ~5–6 hours.",
        "By train: arrive at Khed railway station, then a ~40 km private-cab drive to Anjarle.",
        "Nearby beaches: Karde Beach, Murud Beach, Ladghar Beach (Red Sand Beach), Tamastirth Beach.",
        "Sacred/heritage sites: Kadyavarcha Ganpati temple (clifftop, right-trunked Ganesha idol), Keshavraj Temple, Suvarnadurg Fort (17th-century Maratha sea fort, reachable by boat from Harnai), Harnai Fort remnants.",
        "Local flavour: Malvani thali, Kombdi vade, Ukadiche modak, Solkadhi; the region is the heartland of the GI-tagged Alphonso mango (exported to 40+ countries).",
        "Nearby stay options (e.g. The Fern Samali Resort, Lotus Eco Beach Resort, Comfort Inn Emerald, SaffronStays villas) are independent third parties, not HoABL-operated or HoABL-endorsed — advise the customer to check availability/conditions independently."
      ],
      objections: [
        "If the customer raises a budget objection: anchor to the 2,002 sq.ft. configuration (lower per-sq.ft. price than any smaller/available unit), mention the flexible payment plan and up to 50% financing — do not promise a discount.",
        "If the customer raises a timing objection ('let me think about it'): note that the 1,367 sq.ft. and 1,506 sq.ft. configurations are already sold out, so only two configurations remain — but never use false urgency beyond what's actually true (only two configurations remaining is itself the real scarcity claim; do not invent a countdown or deadline).",
        "If the customer asks whether this is genuine or safe: point to the independent Liases Foras research report and the MahaRERA registration numbers above as the concrete, checkable evidence — that IS the answer; only note that physically verifying original documents happens at KYC.",
        "If the customer is undecided at the end of a call, it's appropriate to ask whether a family member or contact might also be interested in a second home/coastal investment — this is a natural closing question, not pressure on the current customer."
      ]
    },
    needsConfirmation: [
      "That the real ₹99,000 Expression-of-Interest amount is what's actually communicated to the customer for this project (the demo app's token-payment screen now reads this per-project value directly, see lib/data.ts's getProjectTokenAmount).",
      "Exact MahaRERA phase/registration number applicable to the customer's specific chosen configuration or pocket.",
      "Konkan Marine Expressway's exact length (cited as both 376 km and 466–498 km across sources) and current construction stage.",
      "HoABL's current total location count (cited as both 8+ and 16 across sources).",
      "Exact village-level land-price mapping in the Liases Foras comparison chart, and which specific appreciation multiple (if any) applies to Anjarle itself.",
      "Customer-specific EMI/payment-plan eligibility and schedule beyond the milestone percentages listed.",
      "Which exact numbered plot/unit within the 2,002 sq.ft. or 2,723 sq.ft. configuration gets allocated to a given customer (the configuration's price and availability status ARE confirmed — see configurations/payment sections — only the specific plot assignment happens at booking).",
      "Construction progress and possession status beyond what's confirmed as of 16 September 2026.",
      "Legal, tax, title or regulatory advice beyond restating the facts already listed above."
    ]
  },
};

// Make the engine immediately multi-project using the projects already present
// in the application. These entries are intentionally conservative: they do
// not expose the UI's illustrative/demo pricing as sales facts.
for (const listing of PROJECTS) {
  if (!PROJECT_KNOWLEDGE[listing.id]) {
    PROJECT_KNOWLEDGE[listing.id] = {
      id: listing.id,
      name: listing.name,
      aliases: [listing.name.toLowerCase()],
      location: listing.location,
      summary: listing.description,
      verifiedFacts: [],
      sections: {
        project: [listing.description, `Location: ${listing.location}.`],
      },
      needsConfirmation: [
        "Approved project brochure/specifications.",
        "Current pricing and plot-level availability.",
        "Amenities and exact development details.",
        "Future infrastructure/development claims.",
        "RERA, possession, title, legal, tax and financing details.",
      ],
    };
  }
}

if (!PROJECT_KNOWLEDGE[PROJECT.id]) {
  PROJECT_KNOWLEDGE[PROJECT.id] = {
    id: PROJECT.id,
    name: PROJECT.name,
    aliases: [PROJECT.name.toLowerCase()],
    location: PROJECT.location,
    summary: PROJECT.tagline,
    verifiedFacts: PROJECT.verified.map((fact) => `${fact.label}: ${fact.value}.`),
    sections: { project: PROJECT.verified.map((fact) => `${fact.label}: ${fact.value}.`) },
    needsConfirmation: PROJECT.needsConfirmation,
  };
}

export function getProjectKnowledge(projectId?: string | null): ProjectKnowledgePackage | null {
  if (!projectId) return null;
  return PROJECT_KNOWLEDGE[projectId] ?? null;
}

export function listProjectKnowledge(): ProjectKnowledgePackage[] {
  return Object.values(PROJECT_KNOWLEDGE);
}
