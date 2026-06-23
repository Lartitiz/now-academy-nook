import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { getLesson } from "@/lib/content.functions";
import { listMyProgress, markLessonCompleted, unmarkLesson } from "@/lib/progress.functions";
import { getMyAccess } from "@/lib/members.functions";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ResourceList } from "@/components/ResourceList";
import { ArrowLeft, ArrowRight, Check, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

const lessonQO = (fn: any, id: string) =>
  queryOptions({ queryKey: ["lesson", id], queryFn: () => fn({ data: { id } }) });
const progressQO = (fn: any) =>
  queryOptions({ queryKey: ["progress"], queryFn: () => fn() });
const accessQO = (fn: any) =>
  queryOptions({ queryKey: ["access"], queryFn: () => fn() });

export const Route = createFileRoute("/_authenticated/lecon/$id")({
  component: LessonPage,
});

function LessonPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchLesson = useServerFn(getLesson);
  const fetchProgress = useServerFn(listMyProgress);
  const fetchAccess = useServerFn(getMyAccess);
  const doMark = useServerFn(markLessonCompleted);
  const doUnmark = useServerFn(unmarkLesson);

  const { data: access } = useSuspenseQuery(accessQO(fetchAccess));
  const { data } = useSuspenseQuery(lessonQO(fetchLesson, id));
  const { data: progress } = useSuspenseQuery(progressQO(fetchProgress));
  const completed = new Set(progress.map((p: any) => p.lesson_id));
  const isDone = completed.has(id);

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

  const lesson = data.lesson as any;
  const resources = Array.isArray(lesson.resources) ? lesson.resources : [];

  return (
    <div className="min-h-screen bg-[#FFF4F8]">
      <Header isAdmin={access.isAdmin} />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <Link
          to="/accueil"
          className="inline-flex items-center text-sm text-[#91014B] hover:text-[#FB3D80] mb-6"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Retour au sommaire
        </Link>

        <article className="space-y-8">
          <header>
            {lesson.modules && (
              <p className="text-xs uppercase tracking-wider text-[#FB3D80] font-medium">
                {lesson.modules.title}
              </p>
            )}
            <h1 className="font-display text-4xl text-[#91014B] mt-2 leading-tight">
              {lesson.title}
            </h1>
          </header>

          {lesson.body && lesson.body.trim().length > 0 && (
            <div className="prose prose-neutral max-w-none rounded-3xl bg-white border border-[#FFD6E8] p-8 shadow-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>{lesson.body}</ReactMarkdown>
            </div>
          )}

          {resources.length > 0 && <ResourceList resources={resources} />}

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
      </main>
    </div>
  );
}
