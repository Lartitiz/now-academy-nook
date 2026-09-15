import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef } from "react";
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
import {
  accessOptions as accessQO,
  modulesOptions as modulesQO,
  progressOptions as progressQO,
  lessonOptions as lessonQO,
} from "@/lib/queries";
import { learningSummary, videoEmbed, safeHttpUrl, type RawResource } from "@/lib/learning";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AccessDenied } from "@/components/AccessDenied";

export const Route = createFileRoute("/_authenticated/lecon/$id")({
  component: LessonPage,
  errorComponent: LessonError,
  notFoundComponent: LessonNotFound,
});

function LessonError({ error, reset }: { error: unknown; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-[#FFF4F8] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-[#FFD6E8] rounded-3xl p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl text-[#91014B] mb-2">Une erreur est survenue</h1>
        <p className="text-sm text-[#91014B]/70 mb-6">
          La leçon n’a pas pu être chargée. Vérifie ta connexion et réessaie.
        </p>
        <div className="flex justify-center gap-2">
          <Button
            onClick={() => {
              void router.options.context?.queryClient.resetQueries({ queryKey: ["lesson"] });
              reset();
            }}
            className="bg-rouge hover:bg-rouge/90 text-white"
          >
            Réessayer
          </Button>
          <Button asChild variant="outline" className="border-[#FFD6E8] text-[#91014B]">
            <Link to="/accueil">Retour au sommaire</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function LessonNotFound() {
  return (
    <div className="min-h-screen bg-[#FFF4F8] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-[#FFD6E8] rounded-3xl p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl text-[#91014B] mb-2">Leçon introuvable</h1>
        <p className="text-sm text-[#91014B]/70 mb-6">
          Cette leçon n'existe plus ou a été déplacée. Le contenu a peut-être été réimporté.
        </p>
        <Button asChild className="bg-rouge hover:bg-rouge/90 text-white">
          <Link to="/accueil">Retour au sommaire</Link>
        </Button>
      </div>
    </div>
  );
}

function urlOf(resource: RawResource): string {
  return typeof resource === "string" ? resource : resource.url;
}

function LessonPage() {
  const fetchAccess = useServerFn(getMyAccess);
  const { data: access } = useSuspenseQuery(accessQO(fetchAccess));
  const { id } = Route.useParams();
  if (!access.isMember && !access.isAdmin) return <AccessDenied />;
  return <LessonContent key={id} isAdmin={access.isAdmin} />;
}

function LessonContent({ isAdmin }: { isAdmin: boolean }) {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchLesson = useServerFn(getLesson);
  const fetchProgress = useServerFn(listMyProgress);
  const fetchModules = useServerFn(listModulesWithLessons);
  const doMark = useServerFn(markLessonCompleted);
  const doUnmark = useServerFn(unmarkLesson);

  const { data } = useSuspenseQuery(lessonQO(fetchLesson, id));
  const { data: progress } = useSuspenseQuery(progressQO(fetchProgress));
  const { data: modules } = useSuspenseQuery(modulesQO(fetchModules));
  const summary = learningSummary(modules, progress);
  const completed = summary.completed;
  const isDone = completed.has(id);

  const lesson = data.lesson;
  const resources = Array.isArray(lesson.resources) ? (lesson.resources as RawResource[]) : [];
  const videos: string[] = Array.isArray(lesson.videos) ? (lesson.videos as string[]) : [];
  const steps: Array<{ title?: string; body?: string; resources?: RawResource[] }> = Array.isArray(
    lesson.steps,
  )
    ? (lesson.steps as Array<{ title?: string; body?: string; resources?: RawResource[] }>)
    : [];
  const intro: string = typeof lesson.intro === "string" ? lesson.intro : "";
  // Collect URLs already shown inside steps to avoid duplicating them at the bottom
  const stepResourceUrls = new Set<string>();
  steps.forEach((s) => (s.resources ?? []).forEach((r) => stepResourceUrls.add(urlOf(r))));
  const leftoverResources = resources.filter((r) => !stepResourceUrls.has(urlOf(r)));

  const totalLessons = summary.total;
  const doneCount = summary.done;
  const pct = summary.percent;
  const [saving, setSaving] = useState(false);

  const activeModuleId = lesson.module_id;
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({
    [activeModuleId]: true,
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavButton = useRef<HTMLButtonElement>(null);

  const toggleModule = (mid: string) => setOpenModules((s) => ({ ...s, [mid]: !s[mid] }));

  const markdownComponents = {
    a({ href, children }: { href?: string; children?: React.ReactNode }) {
      const safe = href && safeHttpUrl(href);
      return safe ? (
        <a href={safe} target="_blank" rel="noopener noreferrer">
          {children}
          <span className="sr-only"> (nouvel onglet)</span>
        </a>
      ) : (
        <span>{children}</span>
      );
    },
    p({ children }: { children?: React.ReactNode }) {
      if (typeof children === "string" && children.trim() === "--- ÉTAPES ---") {
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
    if (saving) return;
    setSaving(true);
    try {
      if (isDone) {
        await doUnmark({ data: { lesson_id: id } });
        toast.success("Leçon remise en cours");
      } else {
        await doMark({ data: { lesson_id: id } });
        toast.success("Bravo, leçon terminée 🎉");
      }
      await qc.invalidateQueries({ queryKey: ["progress"] });
    } catch {
      toast.error("La progression n’a pas été enregistrée. Réessaie.");
    } finally {
      setSaving(false);
    }
  };

  const Sidebar = (
    <aside className="bg-white border border-[#FFD6E8] rounded-3xl p-5 shadow-sm">
      <div className="mb-5">
        <p className="font-display text-xl text-[#91014B] leading-tight">Now' Academy</p>
        <div className="mt-3 flex items-center justify-between text-xs text-[#91014B]/80">
          <span>Progression</span>
          <span className="font-medium">
            {doneCount}/{totalLessons}
          </span>
        </div>
        <div className="mt-2 h-2 w-full bg-[#FFD6E8] rounded-full overflow-hidden">
          <div className="h-full bg-[#FB3D80] transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <nav aria-label="Sommaire des leçons" className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {modules.map((m) => {
          const open = openModules[m.id] ?? false;
          return (
            <div key={m.id} className="rounded-2xl border border-[#FFD6E8]/60 overflow-hidden">
              <button
                aria-expanded={open}
                onClick={() => toggleModule(m.id)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-[#FFF4F8] transition"
              >
                <span className="text-sm font-medium text-[#91014B] break-words">{m.title}</span>
                <ChevronDown
                  className={`h-4 w-4 text-[#FB3D80] shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>
              {open && (
                <ul className="px-1.5 pb-2 space-y-0.5">
                  {(m.lessons ?? []).map((l) => {
                    const done = completed.has(l.id);
                    const active = l.id === id;
                    return (
                      <li key={l.id}>
                        <Link
                          to="/lecon/$id"
                          params={{ id: l.id }}
                          aria-current={active ? "page" : undefined}
                          onClick={() => setMobileNavOpen(false)}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition ${
                            active
                              ? "bg-[#FFD6E8] text-[#91014B] font-semibold"
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
                          <span className="min-w-0 break-words">
                            {l.title}
                            <span className="sr-only">{done ? " — terminée" : ""}</span>
                          </span>
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
      <Header isAdmin={isAdmin} />
      <main id="contenu" className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
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
            ref={mobileNavButton}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(true)}
          >
            {mobileNavOpen ? <X className="h-4 w-4 mr-1" /> : <Menu className="h-4 w-4 mr-1" />}
            Leçons
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-8">
          <div className="hidden lg:block">
            <div className="sticky top-24">{Sidebar}</div>
          </div>
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetContent
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                mobileNavButton.current?.focus();
              }}
              side="left"
              className="w-[min(90vw,360px)] overflow-y-auto bg-rose-pale p-4"
            >
              <SheetTitle className="pr-8 text-rouge">Le programme</SheetTitle>
              <SheetDescription className="mb-5 mt-2 pr-8">
                Choisis une leçon pour continuer.
              </SheetDescription>
              {Sidebar}
            </SheetContent>
          </Sheet>

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
                  <span className="text-[#91014B]/70 normal-case tracking-normal">
                    {lesson.title}
                  </span>
                </p>
              )}
              <h1 className="font-display text-3xl sm:text-4xl text-[#91014B] mt-3 leading-tight">
                {lesson.title}
              </h1>
            </header>

            {videos.length > 0 && (
              <div className="space-y-4">
                {videos.map((v, i) => {
                  const embed = videoEmbed(v);
                  if (!embed)
                    return (
                      <ResourceList key={i} resources={[{ label: `Vidéo ${i + 1}`, url: v }]} />
                    );
                  return (
                    <div
                      key={i}
                      className="aspect-video w-full overflow-hidden rounded-3xl border border-[#FFD6E8] shadow-sm bg-black/5"
                    >
                      <iframe
                        src={embed}
                        loading="lazy"
                        title={`Vidéo ${i + 1}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {intro && intro.trim().length > 0 && (
              <div className="lesson-prose rounded-3xl bg-white border border-[#FFD6E8] p-6 sm:p-8 shadow-sm">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={markdownComponents}
                >
                  {intro}
                </ReactMarkdown>
              </div>
            )}

            {steps.length > 0 && (
              <div className="space-y-5">
                {steps.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-3xl bg-white border border-[#FFD6E8] shadow-sm p-6 sm:p-8 space-y-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-[#FB3D80] text-white text-sm font-semibold shrink-0">
                        {i + 1}
                      </span>
                      {s.title && (
                        <h2 className="font-display text-[18px] sm:text-lg text-rouge leading-snug m-0">
                          {s.title}
                        </h2>
                      )}
                    </div>
                    {s.body && s.body.trim().length > 0 && (
                      <div className="lesson-prose">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkBreaks]}
                          components={markdownComponents}
                        >
                          {s.body}
                        </ReactMarkdown>
                      </div>
                    )}
                    {s.resources && s.resources.length > 0 && (
                      <div className="pt-2">
                        <ResourceList resources={s.resources} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {lesson.body && lesson.body.trim().length > 0 && (
              <div className="lesson-prose rounded-3xl bg-white border border-[#FFD6E8] p-6 sm:p-8 shadow-sm">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={markdownComponents}
                >
                  {lesson.body}
                </ReactMarkdown>
              </div>
            )}

            {leftoverResources.length > 0 && <ResourceList resources={leftoverResources} />}

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#FFD6E8]">
              <Button
                onClick={toggle}
                disabled={saving}
                aria-pressed={isDone}
                className={
                  isDone
                    ? "bg-[#FFE561] hover:bg-[#FFE561]/80 text-[#91014B]"
                    : "bg-rouge hover:bg-rouge/90 text-white"
                }
              >
                {saving ? (
                  "Enregistrement…"
                ) : isDone ? (
                  <>
                    <Check className="h-4 w-4 mr-2" /> Terminée · remettre en cours
                  </>
                ) : (
                  "J’ai terminé cette leçon"
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
