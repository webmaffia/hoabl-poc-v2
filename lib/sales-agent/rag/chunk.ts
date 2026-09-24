export function chunkText(text: string, maxChars = 1800, overlap = 250): string[] {
  const normalized = text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChars) {
      if (current) { chunks.push(current); current = ""; }
      for (let i = 0; i < paragraph.length; i += maxChars - overlap) {
        chunks.push(paragraph.slice(i, i + maxChars).trim());
      }
      continue;
    }

    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= maxChars) current = candidate;
    else {
      chunks.push(current);
      current = `${current.slice(Math.max(0, current.length - overlap))}\n\n${paragraph}`.trim();
    }
  }

  if (current) chunks.push(current);
  return chunks.filter(Boolean);
}
