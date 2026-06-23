import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

type Resource = { label: string; url: string };
type RawResource = string | Resource;

function normalizeResource(r: RawResource): Resource {
  if (typeof r === "string") {
    const url = r;
    let label = "Ressource";
    if (url.includes("youtube.com") || url.includes("youtu.be")) label = "Vidéo YouTube";
    else if (url.includes("loom.com")) label = "Vidéo Loom";
    else if (url.includes("canva.com")) label = "Ressource Canva";
    else if (url.includes("docs.google.com")) label = "Document Google Docs";
    return { url, label };
  }
  return r;
}

function getYouTubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}
function getLoomEmbed(url: string): string | null {
  const m = url.match(/loom\.com\/(?:share|embed)\/([\w-]+)/);
  return m ? `https://www.loom.com/embed/${m[1]}` : null;
}

export function ResourceList({ resources }: { resources: Resource[] }) {
  if (!resources || resources.length === 0) return null;

  return (
    <div className="space-y-5">
      <h3 className="font-display text-2xl text-[#91014B]">Ressources</h3>
      <div className="space-y-6">
        {resources.map((r, i) => {
          const yt = getYouTubeEmbed(r.url);
          const loom = getLoomEmbed(r.url);
          if (yt || loom) {
            return (
              <div key={i} className="space-y-2">
                <p className="text-sm font-medium text-[#91014B]">{r.label}</p>
                <div className="aspect-video w-full overflow-hidden rounded-2xl border border-[#FFD6E8] shadow-sm bg-black/5">
                  <iframe
                    src={yt ?? loom!}
                    title={r.label}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </div>
            );
          }
          return (
            <div
              key={i}
              className="flex items-center justify-between gap-4 rounded-2xl border border-[#FFD6E8] bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-medium text-[#91014B]">{r.label}</p>
                <p className="text-xs text-muted-foreground break-all">{r.url}</p>
              </div>
              <Button
                asChild
                size="sm"
                className="bg-[#FB3D80] hover:bg-[#91014B] text-white"
              >
                <a href={r.url} target="_blank" rel="noreferrer">
                  Ouvrir <ExternalLink className="ml-2 h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
