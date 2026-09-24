export interface ProjectKnowledgePackage {
  id: string;
  name: string;
  aliases: string[];
  location: string;
  summary: string;
  verifiedFacts: string[];
  sections: Record<string, string[]>;
  needsConfirmation: string[];
}
