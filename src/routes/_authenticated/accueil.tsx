import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listModulesWithLessons } from "@/lib/content.functions";
import { listMyProgress } from "@/lib/progress.functions";
import { getMyAccess } from "@/lib/members.functions";
import { Header } from "@/components/Header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const modulesQO = (fn: any) =>
  queryOptions({ queryKey: ["modules"], queryFn: () => fn() });
const progressQO = (fn: any) =>
  queryOptions({ queryKey: ["progress"], queryFn: () => fn() });
const accessQO = (fn: any) =>
  queryOptions({ queryKey: ["access"], queryFn: () => fn() });

export const Route = createFileRoute("/_authenticated/accueil")({
  component: Accueil,
});

function Accueil() {
  const navigate = useNavigate();
  const fetchModules = useServerFn(listModulesWithLessons);
  const fetchProgress = useServerFn(listMyProgress);
  const fetchAccess = useServerFn(getMyAccess);

  const { data: access } = useSuspenseQuery(accessQO(fetchAccess));

  if (!access.isMember && !access.isAdmin) {
    return (
      <div className="min-h-screen bg-[#FFF4F8] flex items-center justify-center p-6">
        <div className="max-w-md text-center bg-white rounded-3xl border border-[#FFD6E8] shadow-sm p-8 space-y-4">
          <h1 className="font-display text-3xl text-[#91014B]">Bienvenue</h1>
          <p className="text-foreground">
            Cet espace est réservé aux inscrit·es de la Now' Academy. Si tu penses qu'il y a une erreur,
            écris à <a href="mailto:laetitia@nowadaysagency.com" className="underline text-[#FB3D80]">laetitia@nowadaysagency.com</a>.
          </p>
          <Button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth", replace: true });
            }}
            className="bg-[#FB3D80] hover:bg-[#91014B] text-white"
          >
            Se déconnecter
          </Button>
        </div>
      </div>
    );
  }

  const { data: modules } = useSuspenseQuery(modulesQO(fetchModules));
  const { data: progress } = useSuspenseQuery(progressQO(fetchProgress));
  const completed = new Set(progress.map((p: any) => p.lesson_id));

  return (
    <div className="min-h-screen bg-[#FFF4F8]">
      <Header isAdmin={access.isAdmin} />
      <main className="max-w-3xl mx-auto px-6 py-12">
        <section className="mb-10">
          <h1 className="font-display text-5xl text-[#91014B] leading-tight">
            Hello, ravie de te retrouver
          </h1>
          <p className="mt-4 text-foreground text-lg">
            Voici la Now' Academy : 7 modules, 37 leçons, à ton rythme.
            Avance comme ça te va, reviens autant de fois que tu veux. Cet espace est à toi.
          </p>
        </section>

        {modules.length === 0 ? (
          <div className="rounded-2xl bg-white border border-[#FFD6E8] p-8 text-center">
            <p className="text-muted-foreground">
              Le contenu sera disponible très bientôt. Reviens dans quelques instants ✨
            </p>
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-4">
            {modules.map((m: any, idx: number) => {
              const total = m.lessons.length;
              const done = m.lessons.filter((l: any) => completed.has(l.id)).length;
              const pct = total === 0 ? 0 : Math.round((done / total) * 100);
              return (
                <AccordionItem
                  key={m.id}
                  value={m.id}
                  className="rounded-2xl bg-white border border-[#FFD6E8] shadow-sm overflow-hidden"
                >
                  <AccordionTrigger className="px-6 py-5 hover:no-underline">
                    <div className="flex-1 text-left">
                      <p className="text-xs uppercase tracking-wider text-[#FB3D80] font-medium">
                        Module {idx + 1}
                      </p>
                      <p className="font-display text-xl text-[#91014B] mt-1">{m.title}</p>
                      <div className="mt-3 flex items-center gap-3">
                        <Progress value={pct} className="h-2 bg-[#FFD6E8] [&>div]:bg-[#FB3D80]" />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {done}/{total}
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-5">
                    <ul className="space-y-2">
                      {m.lessons.map((l: any) => {
                        const ok = completed.has(l.id);
                        return (
                          <li key={l.id}>
                            <Link
                              to="/lecon/$id"
                              params={{ id: l.id }}
                              className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-[#FFF4F8] transition group"
                            >
                              {ok ? (
                                <CheckCircle2 className="h-5 w-5 text-[#FB3D80] shrink-0" />
                              ) : (
                                <Circle className="h-5 w-5 text-[#FFA7C6] shrink-0" />
                              )}
                              <span className="text-foreground group-hover:text-[#91014B]">
                                {l.title}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </main>
    </div>
  );
}
