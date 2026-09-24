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
    location: "Anjarle, Konkan coast, Maharashtra",
    summary: "Sea × Hill branded land development on the Konkan coast.",
    verifiedFacts: [
      "100+ acres",
      "7-star master plan",
      "Designed by Sanjay Puri",
      "Hospitality by Miros",
      "Konkan's largest clubhouse inaugurated 21 March 2026",
      "Possession by end of 2026",
      "MahaRERA registered, as stated in the supplied sales material"
    ],
    sections: {
      project: [
        "100+ acres.",
        "7-star master plan designed by Sanjay Puri.",
        "Hospitality by Miros.",
        "Konkan's largest clubhouse inaugurated 21 March 2026.",
        "Possession by end of 2026."
      ],
      configurations: [
        "1,367 sq.ft. — ₹39.99 lakhs — sold out.",
        "1,506 sq.ft. — ₹43.99 lakhs — sold out.",
        "2,002 sq.ft. — ₹61.94 lakhs — available in the supplied material.",
        "2,723 sq.ft. — ₹83.87 lakhs — available in the supplied material."
      ],
      payment: [
        "Full-payment route is offered.",
        "EMI/payment-plan option is offered.",
        "Financing up to 50% is stated in the supplied material.",
        "Exact token amount, EMI schedule and customer eligibility must be confirmed by the advisor if not explicitly supplied."
      ],
      location: [
        "Sahyadri ranges meet the Arabian Sea.",
        "Nine beaches are referenced in the supplied material.",
        "The material describes the coastline as geographically rare and subject to CRZ protection."
      ],
      connectivity: [
        "Under 6 hours from Mumbai and Pune today, as stated in the supplied material.",
        "Approximately 3 hours post infrastructure upgrades, as stated in the supplied material.",
        "NH66, Konkan Marine Expressway/Coastal Road, Vande Bharat and Ro-Ro ferry are referenced in the supplied material.",
        "Navi Mumbai International Airport is referenced as inaugurated in 2025 in the supplied material."
      ],
      futureDevelopment: [
        "Use only the infrastructure upgrades explicitly referenced in the supplied material.",
        "Do not invent completion dates, new projects, distances or investment outcomes."
      ],
      amenities: [
        "20,000 sq.ft. clubhouse.",
        "Clubhouse positioned about 300 feet above sea level.",
        "Infinity pool and global cuisine/F&B concepts are referenced in the supplied material."
      ],
      investment: [
        "The supplied material states 3–4X Konkan land appreciation over the last decade.",
        "The supplied material states up to 5X projected appreciation by 2035.",
        "The supplied material states 15%+ rental yield potential.",
        "These are project-material claims and must not be presented as guaranteed returns."
      ]
    },
    needsConfirmation: [
      "Exact token amount.",
      "Customer-specific EMI/payment-plan eligibility and schedule.",
      "Current plot-level availability beyond the supplied configuration table.",
      "Any future development not explicitly stated in the supplied material.",
      "Legal, tax, title or regulatory advice."
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
