import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { getLesson, listModulesWithLessons } from "@/lib/content.functions";
import { listMyProgress, markLessonCompleted, unmarkLesson } from "@/lib/progress.functions";
import { getMyAccess } from "@/lib/members.functions";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ResourceList } from "@/components/ResourceList";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronDown, Menu, X } from "lucide-react";
import { toast } from "sonner";

const lessonQO = (fn: any, id: string) =>
  queryOptions({ queryKey: ["lesson", id], queryFn: () => fn({ data: { id } }) });
const progressQO = (fn: any) =>
  queryOptions({ queryKey: ["progress"], queryFn: () => fn() });
const accessQO = (fn: any) =>
  queryOptions({ queryKey: ["access"], queryFn: () => fn() });
const modulesQO = (fn: any) =>
  queryOptions({ queryKey: ["modules"], queryFn: () => fn() });

export const Route = createFileRoute("/_authenticated/lecon/$id")({
  component: LessonPage,
});

function isVideoUrl(url: string) {
  return /youtube\.com|youtu\.be|loom\.com/.test(url);
}
function urlOf(r: any): string {
  return typeof r === "string" ? r : r?.url ?? "";
}
function labelFromUrl(url: string): string {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "Vidéo YouTube";
  if (url.includes("loom.com")) return "Vidéo Loom";
  if (url.includes("canva.com")) return "Ressource Canva";
  if (url.includes("docs.google.com")) return "Document Google Docs";
  return "Ressource";
}
function getYouTubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}
function getLoomEmbed(url: string): string | null {
  const m = url.match(/loom\.com\/(?:share|embed)\/([\w-]+)/);
  return m ? `https://www.loom.com/embed/${m[1]}` : null;
}

function LessonPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchLesson = useServerFn(getLesson);
  const fetchProgress = useServerFn(listMyProgress);
  const fetchAccess = useServerFn(getMyAccess);
  const fetchModules = useServerFn(listModulesWithLessons);
  const doMark = useServerFn(markLessonCompleted);
  const doUnmark = useServerFn(unmarkLesson);

  const { data: access } = useSuspenseQuery(accessQO(fetchAccess));
  const { data } = useSuspenseQuery(lessonQO(fetchLesson, id));
  const { data: progress } = useSuspenseQuery(progressQO(fetchProgress));
  const { data: modules } = useSuspenseQuery(modulesQO(fetchModules));
  const completed = new Set(progress.map((p: any) => p.lesson_id));
  const isDone = completed.has(id);

  const lesson = data.lesson as any;
  const resources = Array.isArray(lesson.resources) ? lesson.resources : [];
  const firstVideo = resources.find((r: any) => isVideoUrl(urlOf(r)));
  const otherResources = resources.filter((r: any) => r !== firstVideo);
  const firstVideoUrl = firstVideo ? urlOf(firstVideo) : null;
  const firstVideoEmbed = firstVideoUrl
    ? getYouTubeEmbed(firstVideoUrl) ?? getLoomEmbed(firstVideoUrl)
    : null;
  const firstVideoLabel = firstVideoUrl ? labelFromUrl(firstVideoUrl) : "";

  const totalLessons = useMemo(
    () => (modules ?? []).reduce((acc: number, m: any) => acc + (m.lessons?.length ?? 0), 0),
    [modules],
  );
  const doneCount = progress.length;
  const pct = totalLessons > 0 ? Math.round((doneCount / totalLessons) * 100) : 0;

  const activeModuleId = lesson.module_id;
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({
    [activeModuleId]: true,
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const toggleModule = (mid: string) =>
    setOpenModules((s) => ({ ...s, [mid]: !s[mid] }));

  const markdownComponents = {
    p({ children }: { children?: React.ReactNode }) {
      if (
        typeof children === "string" &&
        children.trim() === "--- ÉTAPES ---"
      ) {
        return (
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[#FFD6E8]" />
            <span className="text-[#FB3D80] font-medium text-xs tracking-[0.2em] uppercase">
              Étapes
            </span>
            <div className="flex-1 h-px bg-[#FFD6E8]" />
          </div>
        );
      }
      return <p>{children}</p>;
    },
  };

  const toggle = async () => {
    try {
      if (isDone) {
        await doUnmark({ data: { lesson_id: id } });
        toast.success("Leçon remise en cours");
      } else {
        await doMark({ data: { lesson_id: id } });
        toast.success("Bravo, leçon terminée 🎉");
      }
      qc.invalidateQueries({ queryKey: ["progress"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    }
  };

  const Sidebar = (
    <aside className="bg-white border border-[#FFD6E8] rounded-3xl p-5 shadow-sm">
      <div className="mb-5">
        <p className="font-display text-xl text-[#91014B] leading-tight">Now' Academy</p>
        <div className="mt-3 flex items-center justify-between text-xs text-[#91014B]/80">
          <span>Progression</span>
          <span className="font-medium">{doneCount}/{totalLessons}</span>
        </div>
        <div className="mt-2 h-2 w-full bg-[#FFD6E8] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#FB3D80] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <nav className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
        {modules.map((m: any) => {
          const open = openModules[m.id] ?? false;
          return (
            <div key={m.id} className="rounded-2xl border border-[#FFD6E8]/60 overflow-hidden">
              <button
                onClick={() => toggleModule(m.id)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-[#FFF4F8] transition"
              >
                <span className="text-sm font-medium text-[#91014B] truncate">{m.title}</span>
                <ChevronDown
                  className={`h-4 w-4 text-[#FB3D80] shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>
              {open && (
                <ul className="px-1.5 pb-2 space-y-0.5">
                  {(m.lessons ?? []).map((l: any) => {
                    const done = completed.has(l.id);
                    const active = l.id === id;
                    return (
                      <li key={l.id}>
                        <Link
                          to="/lecon/$id"
                          params={{ id: l.id }}
                          onClick={() => setMobileNavOpen(false)}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition ${
                            active
                              ? "bg-[#FFD6E8] text-[#FB3D80] font-semibold"
                              : "text-[#91014B]/80 hover:bg-[#FFF4F8]"
                          }`}
                        >
                          <span
                            className={`h-3.5 w-3.5 rounded-full border-2 shrink-0 ${
                              done
                                ? "bg-[#FB3D80] border-[#FB3D80]"
                                : "border-[#FFA7C6] bg-transparent"
                            }`}
                          />
                          <span className="truncate">{l.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#FFF4F8]">
      <Header isAdmin={access.isAdmin} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between gap-3 mb-6 lg:hidden">
          <Link
            to="/accueil"
            className="inline-flex items-center text-sm text-[#91014B] hover:text-[#FB3D80]"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Sommaire
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="border-[#FFD6E8] text-[#91014B]"
            onClick={() => setMobileNavOpen((v) => !v)}
          >
            {mobileNavOpen ? <X className="h-4 w-4 mr-1" /> : <Menu className="h-4 w-4 mr-1" />}
            Leçons
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-8">
          <div className={`${mobileNavOpen ? "block" : "hidden"} lg:block`}>
            <div className="lg:sticky lg:top-6">{Sidebar}</div>
          </div>

          <article className="min-w-0 space-y-8">
            <div className="hidden lg:block">
              <Link
                to="/accueil"
                className="inline-flex items-center text-sm text-[#91014B] hover:text-[#FB3D80] mb-4"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Retour au sommaire
              </Link>
            </div>

            <header>
              {lesson.modules && (
                <p className="text-xs uppercase tracking-[0.18em] text-[#FB3D80] font-medium">
                  {lesson.modules.title} <span className="text-[#FFA7C6] mx-1">/</span>{" "}
                  <span className="text-[#91014B]/70 normal-case tracking-normal">{lesson.title}</span>
                </p>
              )}
              <h1 className="font-display text-3xl sm:text-4xl text-[#91014B] mt-3 leading-tight">
                {lesson.title}
              </h1>
            </header>

            {firstVideoEmbed && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[#FB3D80] uppercase tracking-wider">
                  {firstVideoLabel}
                </p>
                <div className="aspect-video w-full overflow-hidden rounded-3xl border border-[#FFD6E8] shadow-sm bg-black/5">
                  <iframe
                    src={firstVideoEmbed}
                    title={firstVideoLabel}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </div>
            )}

            {lesson.body && lesson.body.trim().length > 0 && (
              <div className="prose prose-neutral max-w-none rounded-3xl bg-white border border-[#FFD6E8] p-6 sm:p-8 shadow-sm">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={markdownComponents}
                >
                  {lesson.body}
                </ReactMarkdown>
              </div>
            )}

            {otherResources.length > 0 && <ResourceList resources={otherResources} />}

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#FFD6E8]">
              <Button
                onClick={toggle}
                className={
                  isDone
                    ? "bg-[#FFE561] hover:bg-[#FFE561]/80 text-[#91014B]"
                    : "bg-[#FB3D80] hover:bg-[#91014B] text-white"
                }
              >
                {isDone ? (
                  <>
                    <Check className="h-4 w-4 mr-2" /> Terminée
                  </>
                ) : (
                  "Marquer comme terminé"
                )}
              </Button>

              <div className="flex gap-2">
                {data.prev ? (
                  <Button
                    variant="outline"
                    className="border-[#FFD6E8] text-[#91014B] hover:bg-[#FFD6E8]"
                    onClick={() => navigate({ to: "/lecon/$id", params: { id: data.prev! } })}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" /> Précédente
                  </Button>
                ) : null}
                {data.next ? (
                  <Button
                    variant="outline"
                    className="border-[#FFD6E8] text-[#91014B] hover:bg-[#FFD6E8]"
                    onClick={() => navigate({ to: "/lecon/$id", params: { id: data.next! } })}
                  >
                    Suivante <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : null}
              </div>
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}
