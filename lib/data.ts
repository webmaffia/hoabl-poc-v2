import { Pocket, Project } from "./types";
import { formatLakh } from "./utils";

// The featured project (PROJECT) and the "other projects" list (PROJECTS)
// use real facts sourced from hoabl.com (name, location, price, hero image).
// The pocket-level layout below (POCKETS) is illustrative demo content —
// HoABL doesn't publish plot-by-plot pocket data — and is labeled as such.

export const PROJECT: Project = {
  id: "aero-estate",
  name: "Aero Estate",
  location: "Khopoli, Mumbai 3.0, Maharashtra",
  tagline: "India's first AAA-rated land, ~40 minutes from Navi Mumbai International Airport",
  heroImage: "https://hoabl-bucket.s3.ap-south-1.amazonaws.com/Website_Image_Desktop_version_jpg_jpeg_e2857df1bd.webp",
  verified: [
    { label: "Plot size", value: "148 sq.m. (~1,600 sq.ft.)" },
    { label: "Starting price", value: "₹99.99 Lakh (all-in)" },
    { label: "Distance to NMIA", value: "~40 minutes" },
    { label: "Position", value: "Equidistant between Mumbai and Pune" },
  ],
  needsConfirmation: [
    "Exact plot-by-plot layout and pocket-wise pricing",
    "RERA registration number",
    "Possession and handover timeline",
  ],
  brochureUrl: "/aero.pdf",
};

// Only Aero Estate has a real brochure PDF in public/. Every other project
// falls back to the same file for this demo (mirrors AERO_VIDEO_URL's
// fallback-to-hero-photo pattern in the walkthrough screen).
const DEFAULT_BROCHURE_URL = "/aero.pdf";

export interface ProjectListing {
  id: string;
  name: string;
  location: string;
  description: string;
  image: string;
}

// The rest of hoabl.com/projects, for "see other projects" — real names,
// locations and images, sourced the same way as PROJECT above.
export const PROJECTS: ProjectListing[] = [
  {
    id: "sarayu-ayodhya",
    name: "The Sarayu Ayodhya",
    location: "Ayodhya, Uttar Pradesh",
    description: "A 7-star land development in Ayodhya",
    image: "https://hoabl-bucket.s3.ap-south-1.amazonaws.com/Web_Site_Banner_June_19x2_02_jpg_0cda8162fc.webp",
  },
  {
    id: "one-goa-rhapsody",
    name: "One Goa — The Rhapsody",
    location: "Bicholim, Goa",
    description: "A climate-positive residential community with clubhouse and beach access",
    image: "https://hoabl-bucket.s3.ap-south-1.amazonaws.com/One_Goa_Image_1_jpg_771bf9993b.webp",
  },
  {
    id: "nagpur-marina",
    name: "Nagpur Marina",
    location: "Nagpur, Maharashtra",
    description: "A 78-acre waterfront land development",
    image: "https://hoabl-bucket.s3.ap-south-1.amazonaws.com/Web_Site_Banner_Nagpur_01_jpg_4b8b661ba4.webp",
  },
  {
    id: "miros-riviera",
    name: "Miros Riviera Resort Villas",
    location: "Vasco da Gama, Goa",
    description: "Fully-furnished resort villas with ownership and rental options",
    image: "https://hoabl-bucket.s3.ap-south-1.amazonaws.com/hero_banner_desktop_jpg_a7e77cadc1.webp",
  },
  {
    id: "golden-gateway",
    name: "Golden Gateway Mumbai 3.0",
    location: "Neral, Maharashtra",
    description: "Weekend residential plots at the foothills of Matheran",
    image: "https://hoabl-bucket.s3.ap-south-1.amazonaws.com/Flight_2_png_4740a0ed9b.webp",
  },
  {
    id: "isle-of-anjarle",
    name: "Isle of Anjarle — The Grand Sea Land Finale",
    location: "Anjarle, Konkan coast, Maharashtra",
    description: "The world's rarest Sea × Hill address — a 100+ acre coastal estate designed by Sanjay Puri",
    // Real client-supplied render (Final Renders/Aerial View.jpg), resized/compressed for web use — not a placeholder or guessed URL.
    image: "/isle-of-anjarle-hero.webp",
  },
];

export const POCKETS: Pocket[] = [
  {
    id: "pocket-a",
    name: "Pocket A",
    zone: "North Pocket",
    price: 3250000,
    sizeSqft: 1800,
    roadAccess: 92,
    privacy: 58,
    amenityProximity: 70,
    view: 65,
    entryPriceScore: 55,
    availability: "available",
    coordinates: { x: 32, y: 28 },
    description: "Corner plot near the main road with strong visibility and easy access.",
    strengths: [
      "Strong road accessibility",
      "Fits a mid-to-upper budget range",
      "Corner plot with dual-side frontage",
      "Close to the planned main entrance",
    ],
    tradeoffs: [
      "Higher price than interior pockets like Pocket C",
      "Less privacy than pockets set back from the road",
      "Amenity proximity may not suit every buyer",
    ],
    verifiedFacts: [
      { label: "Plot size", value: "1,800 sq.ft." },
      { label: "Listed price", value: "₹32.5L" },
      { label: "Location", value: "North Pocket, near main road" },
      { label: "Availability", value: "Available" },
    ],
  },
  {
    id: "pocket-b",
    name: "Pocket B",
    zone: "North Pocket",
    price: 2980000,
    sizeSqft: 1650,
    roadAccess: 80,
    privacy: 62,
    amenityProximity: 66,
    view: 60,
    entryPriceScore: 62,
    availability: "available",
    coordinates: { x: 22, y: 20 },
    description: "Mid-sized plot a short walk from the main road, balanced across most factors.",
    strengths: [
      "Balanced price-to-size ratio",
      "Good road accessibility",
      "Reasonable privacy for a north-facing plot",
    ],
    tradeoffs: [
      "Smaller than Pocket A and Pocket C",
      "Amenity block is a longer walk than from Central Park pockets",
    ],
    verifiedFacts: [
      { label: "Plot size", value: "1,650 sq.ft." },
      { label: "Listed price", value: "₹29.8L" },
      { label: "Location", value: "North Pocket" },
      { label: "Availability", value: "Available" },
    ],
  },
  {
    id: "pocket-c",
    name: "Pocket C",
    zone: "Central Park",
    price: 2750000,
    sizeSqft: 2000,
    roadAccess: 63,
    privacy: 78,
    amenityProximity: 88,
    view: 82,
    entryPriceScore: 70,
    availability: "available",
    coordinates: { x: 50, y: 50 },
    description: "Larger interior plot facing the planned central park, quieter setting.",
    strengths: [
      "Larger plot at a lower price than Pocket A",
      "Faces the planned central park amenity",
      "Better long-term value on a price-per-sqft basis",
    ],
    tradeoffs: [
      "Weaker direct road accessibility than Pocket A",
      "Set further from the main entrance",
    ],
    verifiedFacts: [
      { label: "Plot size", value: "2,000 sq.ft." },
      { label: "Listed price", value: "₹27.5L" },
      { label: "Location", value: "Central Park facing" },
      { label: "Availability", value: "Available" },
    ],
  },
  {
    id: "pocket-d",
    name: "Pocket D",
    zone: "Central Park",
    price: 3050000,
    sizeSqft: 2100,
    roadAccess: 58,
    privacy: 85,
    amenityProximity: 84,
    view: 88,
    entryPriceScore: 58,
    availability: "limited",
    plotsLeft: 3,
    coordinates: { x: 58, y: 62 },
    description: "Premium park-facing plot with the highest privacy score in the layout.",
    strengths: [
      "Highest privacy score in the project",
      "Strong park-facing view",
      "Largest plot among Central Park pockets",
    ],
    tradeoffs: [
      "Limited availability — fewer units remain",
      "Longer walk to the main road entrance",
    ],
    verifiedFacts: [
      { label: "Plot size", value: "2,100 sq.ft." },
      { label: "Listed price", value: "₹30.5L" },
      { label: "Location", value: "Central Park facing" },
      { label: "Availability", value: "Limited — 3 plots left (demo)" },
    ],
  },
  {
    id: "pocket-e",
    name: "Pocket E",
    zone: "West Pocket",
    price: 1950000,
    sizeSqft: 1150,
    roadAccess: 70,
    privacy: 55,
    amenityProximity: 52,
    view: 48,
    entryPriceScore: 85,
    availability: "available",
    coordinates: { x: 15, y: 60 },
    description: "Compact, entry-friendly plot on the western edge of the layout.",
    strengths: [
      "Lowest entry price in the project",
      "Reasonable road access",
      "Good option for a smaller first investment",
    ],
    tradeoffs: [
      "Smallest plot size in the layout",
      "Furthest from the central amenities",
    ],
    verifiedFacts: [
      { label: "Plot size", value: "1,150 sq.ft." },
      { label: "Listed price", value: "₹19.5L" },
      { label: "Location", value: "West Pocket" },
      { label: "Availability", value: "Available" },
    ],
  },
  {
    id: "pocket-f",
    name: "Pocket F",
    zone: "East Pocket",
    price: 3500000,
    sizeSqft: 1750,
    roadAccess: 88,
    privacy: 50,
    amenityProximity: 74,
    view: 70,
    entryPriceScore: 45,
    availability: "available",
    coordinates: { x: 82, y: 34 },
    description: "High-visibility plot near the eastern arterial road, strong accessibility.",
    strengths: [
      "Strong accessibility from the eastern arterial road",
      "Close to the planned commercial strip",
      "Good resale visibility",
    ],
    tradeoffs: [
      "Sits closer to the upper end of a typical budget range",
      "Lower privacy due to road-facing position",
    ],
    verifiedFacts: [
      { label: "Plot size", value: "1,750 sq.ft." },
      { label: "Listed price", value: "₹35L" },
      { label: "Location", value: "East Pocket, near arterial road" },
      { label: "Availability", value: "Available" },
    ],
  },
  {
    id: "pocket-g",
    name: "Pocket G",
    zone: "East Pocket",
    price: 2650000,
    sizeSqft: 1600,
    roadAccess: 68,
    privacy: 72,
    amenityProximity: 60,
    view: 58,
    entryPriceScore: 74,
    availability: "sold",
    coordinates: { x: 74, y: 55 },
    description: "Interior east pocket plot, now sold out — shown for layout context.",
    strengths: ["Balanced privacy and access", "Competitive pricing at launch"],
    tradeoffs: ["No longer available"],
    verifiedFacts: [
      { label: "Plot size", value: "1,600 sq.ft." },
      { label: "Listed price", value: "₹26.5L" },
      { label: "Location", value: "East Pocket" },
      { label: "Availability", value: "Sold" },
    ],
  },
  {
    id: "pocket-h",
    name: "Pocket H",
    zone: "West Pocket",
    price: 2900000,
    sizeSqft: 1900,
    roadAccess: 60,
    privacy: 68,
    amenityProximity: 56,
    view: 62,
    entryPriceScore: 64,
    availability: "available",
    coordinates: { x: 12, y: 42 },
    description: "Mid-sized plot on the quieter western edge with moderate access.",
    strengths: ["Good size-to-price ratio", "Reasonably quiet setting"],
    tradeoffs: ["Amenity block is further away", "Moderate road access"],
    verifiedFacts: [
      { label: "Plot size", value: "1,900 sq.ft." },
      { label: "Listed price", value: "₹29L" },
      { label: "Location", value: "West Pocket" },
      { label: "Availability", value: "Available" },
    ],
  },
];

// Isle of Anjarle's two remaining configurations, real per the 16.09.2026
// Closing Deck (see lib/sales-agent/projects/registry.ts for full sourcing).
// Unlike the illustrative-pricing projects below, this project's price and
// size are real — only the road-access/privacy/view/entry-price scoring
// dimensions are demo-illustrative, matching this app's existing convention
// for every project's pocket-level scoring (see the note atop this file).
export const ISLE_OF_ANJARLE_POCKETS: Pocket[] = [
  {
    id: "isle-of-anjarle--config-2002",
    name: "2,002 Sq.Ft. Villa Land",
    zone: "Cliffside Estate",
    price: 6194000,
    sizeSqft: 2002,
    roadAccess: 55,
    privacy: 78,
    amenityProximity: 85,
    view: 90,
    entryPriceScore: 60,
    availability: "available",
    coordinates: { x: 42, y: 45 },
    description: "The smaller of the two remaining Isle of Anjarle configurations, all-inclusive pricing per the 16 September 2026 Closing Deck.",
    strengths: [
      "Lower total ticket size of the two available configurations",
      "Same clifftop clubhouse, amenities and Miros hospitality access as the larger configuration",
      "All-inclusive pricing — CAM and corpus are the only additions",
    ],
    tradeoffs: [
      "Smaller land parcel than the 2,723 sq.ft. configuration",
      "Less villa-build flexibility than the larger configuration, per the supplied sales material",
    ],
    verifiedFacts: [
      { label: "Plot size", value: "2,002 sq.ft. (186 sq.m.)" },
      { label: "Listed price", value: "₹61.94 Lakh, all-inclusive (CAM & corpus extra)" },
      { label: "Location", value: "Isle of Anjarle, Anjarle, Konkan coast" },
      { label: "Availability", value: "Available, per the 16 Sept 2026 Closing Deck" },
    ],
  },
  {
    id: "isle-of-anjarle--config-2723",
    name: "2,723 Sq.Ft. Villa Land",
    zone: "Cliffside Estate",
    price: 8387000,
    sizeSqft: 2723,
    roadAccess: 55,
    privacy: 82,
    amenityProximity: 85,
    view: 92,
    entryPriceScore: 48,
    availability: "available",
    coordinates: { x: 58, y: 55 },
    description: "The larger of the two remaining configurations — positioned in the supplied sales material as the stronger villa-build option with a lower price per sq.ft.",
    strengths: [
      "Lower price per sq.ft. than the 2,002 sq.ft. configuration",
      "Genuine villa-build potential, per the supplied sales material",
      "Same clifftop clubhouse, amenities and Miros hospitality access as the smaller configuration",
    ],
    tradeoffs: [
      "Higher total ticket size of the two available configurations",
    ],
    verifiedFacts: [
      { label: "Plot size", value: "2,723 sq.ft. (253 sq.m.)" },
      { label: "Listed price", value: "₹83.87 Lakh, all-inclusive (CAM & corpus extra)" },
      { label: "Location", value: "Isle of Anjarle, Anjarle, Konkan coast" },
      { label: "Availability", value: "Available, per the 16 Sept 2026 Closing Deck" },
    ],
  },
];

// This project's real Expression-of-Interest amount (₹99,000, per the
// Closing Deck) differs from every other project's generic ₹45,000
// demo-placeholder token screen — see screen-07-token-kyc.tsx /
// screen-08-access-unlocked.tsx, which read this instead of a hardcoded
// constant so the token amount shown always matches the active project.
const DEFAULT_TOKEN_AMOUNT = 45000;
export const PROJECT_TOKEN_AMOUNT: Record<string, number> = {
  "isle-of-anjarle": 99000,
};
export function getProjectTokenAmount(projectId: string): number {
  return PROJECT_TOKEN_AMOUNT[projectId] ?? DEFAULT_TOKEN_AMOUNT;
}

// --- Multi-project support -------------------------------------------------
// Only Aero Estate (PROJECT above) has real, sourced facts. The other 5 real
// HoABL projects in PROJECTS don't have published pricing or plot-level
// data, so — to let a buyer go through the same interactive flow with any
// of them — we generate an illustrative pocket layout for each, reusing the
// same demo template as Aero Estate's own POCKETS (already labeled as
// illustrative throughout the app), scaled to that project's own
// illustrative starting price. This is explicitly demo content, not real
// HoABL pricing or availability.

export const PROJECT_STARTING_PRICE: Record<string, number> = {
  "aero-estate": 9999000, // real, from hoabl.com
  "sarayu-ayodhya": 15000000,
  "one-goa-rhapsody": 8500000,
  "nagpur-marina": 6500000,
  "miros-riviera": 12000000,
  "golden-gateway": 4500000,
};

const REFERENCE_AVG_POCKET_PRICE = POCKETS.reduce((sum, p) => sum + p.price, 0) / POCKETS.length;

function generatePocketsFor(projectId: string): Pocket[] {
  if (projectId === PROJECT.id) return POCKETS;
  const startingPrice = PROJECT_STARTING_PRICE[projectId];
  if (!startingPrice) return POCKETS;
  const scale = startingPrice / REFERENCE_AVG_POCKET_PRICE;
  return POCKETS.map((p) => {
    const price = Math.round((p.price * scale) / 5000) * 5000;
    return {
      ...p,
      id: `${projectId}--${p.id}`,
      price,
      verifiedFacts: p.verifiedFacts.map((f) => (f.label === "Listed price" ? { ...f, value: formatLakh(price) } : f)),
    };
  });
}

const POCKETS_BY_PROJECT: Record<string, Pocket[]> = Object.fromEntries(
  [PROJECT.id, ...PROJECTS.map((p) => p.id)].map((id) => [id, generatePocketsFor(id)])
);
// Real configurations, not the generic illustrative-scaling pipeline above.
POCKETS_BY_PROJECT["isle-of-anjarle"] = ISLE_OF_ANJARLE_POCKETS;

export function getProjectPockets(projectId: string): Pocket[] {
  return POCKETS_BY_PROJECT[projectId] || POCKETS;
}

// Isle of Anjarle has real, sourced facts (see registry.ts) — unlike the
// other projects in PROJECTS, which fall through to the generic
// illustrative-pricing branch below.
const ISLE_OF_ANJARLE_PROJECT: Project = {
  id: "isle-of-anjarle",
  name: "Isle of Anjarle — The Grand Sea Land Finale",
  location: "Anjarle, North Ratnagiri district, Konkan coast, Maharashtra",
  tagline: "The world's rarest Sea × Hill address",
  heroImage: "/isle-of-anjarle-hero.webp",
  verified: [
    { label: "Configurations available", value: "2,002 sq.ft. (₹61.94L) and 2,723 sq.ft. (₹83.87L), all-inclusive" },
    { label: "Expression of Interest", value: "₹99,000, fully refundable" },
    { label: "Master plan", value: "100+ acres, designed by Sanjay Puri" },
    { label: "Possession", value: "End of 2026, per the supplied material" },
  ],
  needsConfirmation: [
    "Which MahaRERA phase/registration number applies to the specific configuration chosen",
    "Current plot-level availability within the two open configurations",
    "Customer-specific EMI/payment-plan eligibility",
  ],
  brochureUrl: DEFAULT_BROCHURE_URL,
};

export function getProjectById(id: string): Project {
  if (id === PROJECT.id) return PROJECT;
  if (id === ISLE_OF_ANJARLE_PROJECT.id) return ISLE_OF_ANJARLE_PROJECT;
  const listing = PROJECTS.find((p) => p.id === id);
  const startingPrice = PROJECT_STARTING_PRICE[id];
  if (!listing || !startingPrice) return PROJECT;
  return {
    id: listing.id,
    name: listing.name,
    location: listing.location,
    heroImage: listing.image,
    tagline: listing.description,
    verified: [{ label: "Starting price", value: `${formatLakh(startingPrice)} (illustrative demo pricing)` }],
    needsConfirmation: [
      "Confirmed pricing and plot-wise availability",
      "RERA registration number",
      "Possession and handover timeline",
    ],
    brochureUrl: DEFAULT_BROCHURE_URL,
  };
}

export function getPocketById(id: string): Pocket | undefined {
  for (const pockets of Object.values(POCKETS_BY_PROJECT)) {
    const found = pockets.find((p) => p.id === id);
    if (found) return found;
  }
  return undefined;
}

/**
 * Honest scarcity signal for a project, derived from its own pockets' real
 * availability state (not fabricated) — used to reinforce urgency at the
 * project-selection stage of the funnel without inventing numbers.
 */
export function projectDemand(projectId: string): { sold: number; limited: number; total: number } {
  const pockets = getProjectPockets(projectId);
  return {
    sold: pockets.filter((p) => p.availability === "sold").length,
    limited: pockets.filter((p) => p.availability === "limited").length,
    total: pockets.length,
  };
}
