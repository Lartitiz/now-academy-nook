export type Exercise = {
  id?: string;
  title?: string;
  body?: string;
  resources?: (string | { label: string; url: string })[];
};

// Legacy content has no IDs. Materialize these IDs in the editor so renaming,
// reordering and deleting an exercise never transfers a tick to another one.
export function withExerciseIds<T extends { id?: string }>(steps: T[]) {
  const result = steps.map((step, index) => ({ ...step, id: step.id || `step-${index + 1}` }));
  if (new Set(result.map((step) => step.id)).size !== result.length) {
    throw new Error("Chaque exercice doit avoir un identifiant distinct.");
  }
  return result;
}

const section =
  /^(?:objectifs?|ta mission|ton tour|le but ici|étapes?(?:\s|$)|pourquoi c.est important|petit challenge|exemples?(?:\s|$)|par exemple|structure(?:\s|$)|formule simple|format simple|conseils?(?:\s|$)|astuces?(?:\s|$)|prompt(?:\s|$)|bonus(?:\s|$))/i;

function emphasize(line: string) {
  if (line.includes("**") || line.includes("__")) return line;
  const words = line.replace(/^[^\p{L}]+/u, "");
  const colon = line.indexOf(":");
  if (section.test(words) && colon > 0 && colon < 90) {
    return `**${line.slice(0, colon + 1)}**${line.slice(colon + 1)}`;
  }
  if (
    line.length < 130 &&
    (section.test(words) ||
      /^(?:\d\uFE0F?\u20E3|\d+\s*[–—-]\s)/u.test(line) ||
      (line.endsWith(":") && line.length < 90 && !/^https?:/i.test(line)))
  )
    return `**${line}**`;
  return line;
}

/** A presentation-only pass for the imported plain-text exercises.
 * Authored Markdown blocks are left intact. No course text or links are rewritten.
 */
export function formatExerciseBody(body: string): string {
  if (
    /^(?:\s{4}|\t|#{1,6}\s|```|~~~|>|\||\s*[-+*]\s|\[.+\]:)/m.test(body) ||
    /^\s*(?:={3,}|-{3,}|\*{3,})\s*$/m.test(body)
  )
    return body;
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) blocks.push(bullets.join("\n"));
    bullets = [];
  };
  for (const [index, raw] of lines.entries()) {
    const line = raw.replace(/\u200B/g, "").trim();
    if (!line) {
      flush();
      continue;
    }
    if (/^\d+[.)]\s/.test(line)) {
      const adjacent =
        /^\d+[.)]\s/.test(lines[index - 1]?.trim() ?? "") ||
        /^\d+[.)]\s/.test(lines[index + 1]?.trim() ?? "");
      if (adjacent) bullets.push(line);
      else {
        flush();
        blocks.push(line.length < 130 ? `**${line}**` : line);
      }
    } else if (/^[•–]\s/.test(line)) {
      bullets.push(`- ${emphasize(line.slice(1).trimStart())}`);
    } else {
      flush();
      blocks.push(emphasize(line));
    }
  }
  flush();
  return blocks.join("\n\n");
}
