import { Button } from "@/components/ui/button";
import { ExternalLink, FileText } from "lucide-react";
import { normalizeResource, safeHttpUrl, videoEmbed, type RawResource } from "@/lib/learning";

export function ResourceList({ resources }: { resources: RawResource[] }) {
  if (!resources?.length) return null;
  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl text-rouge">Ressources</h2>
      <div className="space-y-4">
        {resources.map(normalizeResource).map((resource, index) => {
          const url = safeHttpUrl(resource.url);
          const embed = videoEmbed(resource.url);
          return (
            <div key={index} className="space-y-3 rounded-2xl border border-rose-doux bg-white p-4">
              <div className="flex flex-wrap items-center gap-3">
                <FileText className="size-5 shrink-0 text-rouge" aria-hidden />
                <div className="min-w-0 flex-1 basis-32">
                  <p className="break-words font-medium text-rouge">{resource.label}</p>
                  <p className="mt-1 break-all text-xs text-muted-foreground">
                    {url ? new URL(url).hostname : "Lien indisponible"}
                  </p>
                </div>
                {url && (
                  <Button
                    asChild
                    size="sm"
                    className="shrink-0 bg-rouge text-white hover:bg-rouge/90"
                  >
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Ouvrir ${resource.label} (nouvel onglet)`}
                    >
                      Ouvrir
                      <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                )}
              </div>
              {embed && (
                <div className="aspect-video overflow-hidden rounded-xl bg-black/5">
                  <iframe
                    src={embed}
                    title={resource.label}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
