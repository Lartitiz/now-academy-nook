import { AccessDenied } from "@/components/AccessDenied";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listModulesWithLessons } from "@/lib/content.functions";
import { listMyProgress } from "@/lib/progress.functions";
import { getMyAccess } from "@/lib/members.functions";
import { accessOptions, modulesOptions, progressOptions } from "@/lib/queries";
import { learningSummary } from "@/lib/learning";
import { Header } from "@/components/Header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ArrowRight, Search, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/accueil")({ component: Accueil });

function Accueil() {
  const fetchAccess = useServerFn(getMyAccess);
  const { data: access } = useSuspenseQuery(accessOptions(fetchAccess));
  if (!access.isMember && !access.isAdmin) return <AccessDenied />;
  return <LearningHome isAdmin={access.isAdmin} />;
}

function LearningHome({ isAdmin }: { isAdmin: boolean }) {
  const fetchModules = useServerFn(listModulesWithLessons);
  const fetchProgress = useServerFn(listMyProgress);
  const { data: modules } = useSuspenseQuery(modulesOptions(fetchModules));
  const { data: progress } = useSuspenseQuery(progressOptions(fetchProgress));
  const summary = learningSummary(modules, progress);
  const [search, setSearch] = useState("");
  const [openModules, setOpenModules] = useState<string[]>(
    summary.next ? [summary.next.module_id] : [],
  );
  const term = search
    .trim()
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const matches = (value: string) =>
    value
      .toLocaleLowerCase("fr")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .includes(term);
  const visible = modules
    .map((module) => ({
      ...module,
      visibleLessons: matches(module.title)
        ? module.lessons
        : module.lessons.filter((lesson) => matches(lesson.title)),
    }))
    .filter((module) => !term || module.visibleLessons.length || matches(module.title));
  const nextModule = modules.find((module) => module.id === summary.next?.module_id);

  return (
    <div className="min-h-screen bg-rose-pale">
      <Header isAdmin={isAdmin} />
      <main id="contenu" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="mb-9 grid gap-7 lg:grid-cols-[1fr_320px] lg:items-center">
          <div>
            <p className="eyebrow">TON ESPACE FORMATION</p>
            <h1 className="mt-3 max-w-2xl font-display text-3xl leading-tight text-rouge sm:text-5xl">
              Un pas de plus,
              <br className="hidden sm:block" /> à ton rythme.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Ravie de te retrouver ici. Choisis une leçon, prends le temps d’essayer et reviens
              quand tu veux.
            </p>
          </div>
          <div className="rounded-2xl border border-rose-doux bg-white p-6">
            <div className="flex items-end justify-between">
              <p className="font-medium text-rouge">Ta progression</p>
              <span className="font-display text-3xl text-rouge">
                {summary.percent}
                <span className="text-lg"> %</span>
              </span>
            </div>
            <Progress
              value={summary.percent}
              aria-label="Progression de la formation"
              className="my-4 h-2 bg-rose-doux [&>div]:bg-framboise"
            />
            <p className="text-sm text-muted-foreground">
              {summary.done} sur {summary.total} leçons terminées
            </p>
            {summary.total > 0 && summary.done === summary.total && (
              <p className="mt-3 text-sm font-medium text-rouge">
                Bravo, tu as parcouru toute la formation !
              </p>
            )}
          </div>
        </section>
        {summary.next && (
          <section className="mb-10 flex flex-col gap-5 rounded-2xl bg-rouge p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-widest text-rose-doux">
                {summary.done ? "ON CONTINUE ?" : "POUR COMMENCER"}
              </p>
              <h2 className="mt-2 font-display text-xl leading-snug sm:text-2xl">
                {summary.next.title}
              </h2>
              <p className="mt-2 text-sm text-rose-doux">{nextModule?.title}</p>
            </div>
            <Button asChild className="h-11 shrink-0 bg-jaune text-rouge hover:bg-jaune/90">
              <Link to="/lecon/$id" params={{ id: summary.next.id }}>
                {summary.done ? "Continuer ma formation" : "Commencer ma formation"}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </section>
        )}
        <section aria-labelledby="programme-title">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="programme-title" className="font-display text-2xl text-rouge">
                Le programme
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {modules.length} modules · {summary.total} leçons · accès à ton rythme
              </p>
            </div>
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                type="search"
                aria-label="Rechercher une leçon"
                placeholder="Rechercher une leçon…"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setOpenModules(
                    event.target.value.trim()
                      ? modules.map((module) => module.id)
                      : summary.next
                        ? [summary.next.module_id]
                        : [],
                  );
                }}
                className="h-10 border-rose-doux bg-white pl-9"
              />
            </div>
          </div>
          {!modules.length ? (
            <div className="rounded-2xl border border-rose-doux bg-white p-8 text-center text-muted-foreground">
              Les premières leçons arrivent bientôt. Tu les retrouveras ici.
            </div>
          ) : !visible.length ? (
            <div
              role="status"
              className="rounded-2xl border border-rose-doux bg-white p-8 text-center"
            >
              <p>Aucune leçon ne correspond à « {search} ».</p>
              <Button variant="ghost" onClick={() => setSearch("")} className="mt-3 text-rouge">
                Effacer la recherche
              </Button>
            </div>
          ) : (
            <Accordion
              type="multiple"
              value={openModules}
              onValueChange={setOpenModules}
              className="space-y-4"
            >
              {visible.map((module) => {
                const done = module.lessons.filter((lesson) =>
                  summary.completed.has(lesson.id),
                ).length;
                const total = module.lessons.length;
                return (
                  <AccordionItem
                    key={module.id}
                    value={module.id}
                    className="overflow-hidden rounded-2xl border border-rose-doux bg-white shadow-sm"
                  >
                    <AccordionTrigger className="items-center px-4 py-5 font-sans hover:no-underline sm:px-6">
                      <div className="flex min-w-0 flex-1 items-center gap-4 text-left">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-rose-pale font-display text-lg text-rouge">
                          {String(modules.findIndex((item) => item.id === module.id) + 1).padStart(
                            2,
                            "0",
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="block font-display text-lg leading-snug text-rouge sm:text-xl">
                            {module.title}
                          </span>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {total ? `${done} / ${total} leçons terminées` : "Leçons à venir"}
                            {total > 0 && done === total ? " · Module terminé" : ""}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-3 sm:px-5">
                      <ul className="space-y-1 border-t border-rose-doux pt-2">
                        {module.visibleLessons.map((lesson) => (
                          <li key={lesson.id}>
                            <Link
                              to="/lecon/$id"
                              params={{ id: lesson.id }}
                              className="group flex items-center gap-3 rounded-xl px-3 py-3 text-foreground transition hover:bg-rose-pale"
                            >
                              <span className="sr-only">
                                {summary.completed.has(lesson.id) ? "Terminée : " : "À suivre : "}
                              </span>
                              {summary.completed.has(lesson.id) ? (
                                <CheckCircle2 aria-hidden className="size-5 shrink-0 text-rouge" />
                              ) : (
                                <Circle aria-hidden className="size-5 shrink-0 text-rose-moyen" />
                              )}
                              <span className="flex-1">{lesson.title}</span>
                              <ArrowRight
                                aria-hidden
                                className="size-4 shrink-0 text-rouge opacity-50 group-hover:opacity-100"
                              />
                            </Link>
                          </li>
                        ))}
                      </ul>
                      {!total && (
                        <p className="p-3 text-muted-foreground">
                          Ce module sera complété prochainement.
                        </p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </section>
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Une question sur ton accès ?{" "}
          <a
            className="text-rouge underline underline-offset-4"
            href="mailto:laetitia@nowadaysagency.com"
          >
            Écris-moi
          </a>
          .
        </p>
      </main>
    </div>
  );
}
