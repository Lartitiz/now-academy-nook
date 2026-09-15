export type LessonSummary = { id: string; title: string; position: number; module_id: string };
export type ModuleSummary = {
  id: string;
  title: string;
  position: number;
  lessons: LessonSummary[];
};
export type LessonProgress = { lesson_id: string; completed_at: string };

export function learningSummary(modules: ModuleSummary[], progress: LessonProgress[]) {
  const lessons = modules.flatMap((module) => module.lessons);
  const completed = new Set(progress.map((item) => item.lesson_id));
  const done = lessons.filter((lesson) => completed.has(lesson.id)).length;
  const next = lessons.find((lesson) => !completed.has(lesson.id));
  return {
    lessons,
    completed,
    done,
    total: lessons.length,
    next,
    percent: lessons.length ? Math.round((done / lessons.length) * 100) : 0,
  };
}

export function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function videoEmbed(value: string): string | null {
  const safe = safeHttpUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  const host = url.hostname.replace(/^www\./, "");
  if (["youtube.com", "m.youtube.com", "youtube-nocookie.com", "youtu.be"].includes(host)) {
    const parts = url.pathname.split("/").filter(Boolean);
    const id =
      host === "youtu.be"
        ? parts[0]
        : (url.searchParams.get("v") ??
          (["embed", "shorts", "live"].includes(parts[0]) ? parts[1] : null));
    if (!id || !/^[\w-]{11}$/.test(id)) return null;
    const result = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
    const time = url.searchParams.get("t") ?? url.searchParams.get("start");
    if (time && /^\d+$/.test(time)) result.searchParams.set("start", time);
    return result.href;
  }
  if (host === "loom.com") {
    const match = url.pathname.match(/^\/(?:share|embed)\/([\w-]+)\/?$/);
    if (match) return `https://www.loom.com/embed/${match[1]}`;
  }
  return null;
}

export type Resource = { label: string; url: string };
export type RawResource = string | Resource;
export function normalizeResource(resource: RawResource): Resource {
  if (typeof resource !== "string")
    return { url: resource.url, label: resource.label || "Ressource" };
  const host = safeHttpUrl(resource) ? new URL(resource).hostname : "";
  const labels: Record<string, string> = {
    "www.youtube.com": "Vidéo YouTube",
    "youtube.com": "Vidéo YouTube",
    "youtu.be": "Vidéo YouTube",
    "www.loom.com": "Vidéo Loom",
    "www.canva.com": "Ressource Canva",
    "docs.google.com": "Document Google",
  };
  return { url: resource, label: labels[host] ?? "Ressource" };
}

export function errorMessage(
  error: unknown,
  fallback = "L’enregistrement a échoué. Réessaie dans un instant.",
) {
  return error instanceof Error ? error.message : fallback;
}
