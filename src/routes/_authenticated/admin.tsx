import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Header } from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  listAdminModules,
  upsertModule,
  upsertLesson,
  deleteLesson,
  deleteModule,
  importSeed,
} from "@/lib/content.functions";
import { listMembers, addMembers, removeMember, getMyAccess } from "@/lib/members.functions";
import { Trash2, Plus, ChevronDown } from "lucide-react";
import {
  accessOptions as accessQO,
  adminModulesOptions as modulesQO,
  membersOptions as membersQO,
} from "@/lib/queries";
import { normalizeResource, errorMessage, type Resource, type RawResource } from "@/lib/learning";
import { useId } from "react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const fetchAccess = useServerFn(getMyAccess);
  const { data: access } = useSuspenseQuery(accessQO(fetchAccess));

  if (!access.isAdmin) {
    return (
      <div className="min-h-screen bg-[#FFF4F8] flex items-center justify-center p-6">
        <div className="max-w-md text-center bg-white rounded-3xl border border-[#FFD6E8] p-8">
          <h1 className="font-display text-2xl text-[#91014B]">Accès réservé</h1>
          <p className="mt-2 text-muted-foreground">Cet espace est réservé à l'admin.</p>
          <Button
            className="mt-4 bg-rouge hover:bg-rouge/90 text-white"
            onClick={() => navigate({ to: "/accueil" })}
          >
            Retour au sommaire
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF4F8]">
      <Header isAdmin />
      <main id="contenu" className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="font-display text-4xl text-[#91014B] mb-8">Espace admin</h1>
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="bg-white border border-[#FFD6E8]">
            <TabsTrigger value="members">Membres</TabsTrigger>
            <TabsTrigger value="content">Contenu</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>
          <TabsContent value="members" className="mt-6">
            <MembersPanel />
          </TabsContent>
          <TabsContent value="content" className="mt-6">
            <ContentPanel />
          </TabsContent>
          <TabsContent value="import" className="mt-6">
            <ImportPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function MembersPanel() {
  const fetchMembers = useServerFn(listMembers);
  const doAdd = useServerFn(addMembers);
  const doRemove = useServerFn(removeMember);
  const qc = useQueryClient();
  const { data: members } = useSuspenseQuery(membersQO(fetchMembers));
  const [raw, setRaw] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    const entries = raw
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const invalid = entries.filter((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    if (invalid.length) {
      toast.error(`Corrige ces adresses avant l’envoi : ${invalid.join(", ")}`);
      return;
    }
    const emails = [...new Set(entries)];
    if (emails.length > 200) {
      toast.error("Ajoute au maximum 200 adresses à la fois.");
      return;
    }
    if (!emails.length) {
      toast.error("Aucun email valide détecté");
      return;
    }
    setLoading(true);
    try {
      const res = await doAdd({ data: { emails } });
      const ok = res.results.filter((r) => r.status !== "error").length;
      const fail = res.results.filter((r) => r.status === "error");
      if (ok) toast.success(`${ok} membre(s) ajouté(s)`);
      if (fail.length) {
        toast.error(`${fail.length} échec(s)`, {
          description: fail
            .map((f) => `${f.email} — ${f.message}`)
            .join("\n")
            .slice(0, 300),
        });
      }
      setRaw(fail.map((result) => result.email).join("\n"));
      qc.invalidateQueries({ queryKey: ["admin-members"] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Supprimer ce membre ? Iel perdra l'accès.")) return;
    try {
      await doRemove({ data: { id } });
      toast.success("Membre supprimé");
      qc.invalidateQueries({ queryKey: ["admin-members"] });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="space-y-8">
      <Card className="p-6 border-[#FFD6E8]">
        <Label htmlFor="member-emails" className="text-[#91014B] mb-2 block">
          Ajouter des membres
        </Label>
        <p className="text-sm text-muted-foreground mb-3">
          Colle une liste d’emails (un par ligne ou séparés par virgules). Les nouveaux comptes
          reçoivent une invitation. Les comptes existants obtiennent l’accès sans nouvel email.
        </p>
        <Textarea
          id="member-emails"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="prenom1@exemple.com&#10;prenom2@exemple.com"
          rows={6}
          className="border-[#FFD6E8] focus-visible:ring-[#FB3D80]"
        />
        <Button
          onClick={handleAdd}
          disabled={loading || !raw.trim()}
          className="mt-4 bg-rouge hover:bg-rouge/90 text-white"
        >
          {loading ? "Envoi des invitations…" : "Envoyer les invitations"}
        </Button>
      </Card>

      <Card className="p-6 border-[#FFD6E8]">
        <h3 className="font-display text-xl text-[#91014B] mb-4">
          Membres actifs ({members.length})
        </h3>
        <div className="divide-y divide-[#FFD6E8]">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun membre pour l'instant.</p>
          ) : (
            members.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0 break-all">
                  <p className="font-medium text-foreground">{m.email}</p>
                  {m.full_name && <p className="text-xs text-muted-foreground">{m.full_name}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Supprimer l’accès de ${m.email}`}
                  onClick={() => handleRemove(m.id)}
                  className="text-[#91014B] hover:bg-[#FFD6E8]"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

type ModuleData = Awaited<ReturnType<typeof listAdminModules>>[number];
type LessonData = ModuleData["lessons"][number];
type LessonPayload = {
  id?: string;
  module_id: string;
  title: string;
  position: number;
  body: string;
  intro?: string;
  videos?: string[];
  steps?: Step[];
  resources: RawResource[];
};
type Step = { title: string; body: string; resources: RawResource[] };

function ContentPanel() {
  const fetchModules = useServerFn(listAdminModules);
  const doUpsertModule = useServerFn(upsertModule);
  const doUpsertLesson = useServerFn(upsertLesson);
  const doDeleteLesson = useServerFn(deleteLesson);
  const doDeleteModule = useServerFn(deleteModule);
  const qc = useQueryClient();
  const { data: modules } = useSuspenseQuery(modulesQO(fetchModules));

  const refresh = async () => {
    await Promise.all(
      ["admin-modules", "modules", "lesson", "progress"].map((key) =>
        qc.invalidateQueries({ queryKey: [key] }),
      ),
    );
  };

  const createModule = async () => {
    const title = prompt("Titre du module ?");
    if (!title?.trim()) return;
    try {
      await doUpsertModule({
        data: {
          title: title.trim(),
          position: Math.max(-1, ...modules.map((module) => module.position)) + 1,
        },
      });
      refresh();
      toast.success("Module créé");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={createModule} className="bg-rouge hover:bg-rouge/90 text-white">
          <Plus className="h-4 w-4 mr-2" /> Nouveau module
        </Button>
      </div>
      {modules.length === 0 ? (
        <Card className="p-8 border-[#FFD6E8] text-center text-muted-foreground">
          Aucun module pour l'instant. Crée-en un, ou importe le fichier JSON dans l'onglet Import.
        </Card>
      ) : (
        modules.map((m) => (
          <ModuleEditor
            key={m.id}
            module={m}
            onSave={async (changes: { title: string; position: number }) => {
              await doUpsertModule({
                data: { id: m.id, title: changes.title, position: changes.position },
              });
              await refresh();
              toast.success("Module enregistré");
            }}
            onDelete={async () => {
              if (!confirm("Supprimer ce module et toutes ses leçons ?")) return;
              await doDeleteModule({ data: { id: m.id } });
              await refresh();
              toast.success("Module supprimé");
            }}
            onLessonSave={async (lesson: LessonPayload) => {
              await doUpsertLesson({ data: lesson });
              await refresh();
              toast.success("Leçon enregistrée");
            }}
            onLessonDelete={async (id: string) => {
              if (!confirm("Supprimer cette leçon ?")) return;
              await doDeleteLesson({ data: { id } });
              await refresh();
              toast.success("Leçon supprimée");
            }}
          />
        ))
      )}
    </div>
  );
}

function ModuleEditor({
  module: mod,
  onSave,
  onDelete,
  onLessonSave,
  onLessonDelete,
}: {
  module: ModuleData;
  onSave: (changes: { title: string; position: number }) => Promise<void>;
  onDelete: () => Promise<void>;
  onLessonSave: (lesson: LessonPayload) => Promise<void>;
  onLessonDelete: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(mod.title);
  const [position, setPosition] = useState(mod.position);
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="border-rose-doux p-4 sm:p-6">
      <fieldset disabled={busy} className="space-y-5">
        <div className="grid grid-cols-[minmax(0,1fr)_80px] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_80px_auto]">
          <div>
            <Label htmlFor={`module-title-${mod.id}`}>Titre du module</Label>
            <Input
              id={`module-title-${mod.id}`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 border-rose-doux"
            />
          </div>
          <div>
            <Label htmlFor={`module-position-${mod.id}`}>Ordre</Label>
            <Input
              id={`module-position-${mod.id}`}
              type="number"
              step="1"
              value={position}
              onChange={(event) => setPosition(Number(event.target.value))}
              className="mt-2 border-rose-doux"
            />
          </div>
          <div className="col-span-2 flex gap-2 sm:col-span-1">
            <Button
              size="sm"
              disabled={!title.trim() || !Number.isInteger(position)}
              onClick={() => run(() => onSave({ title: title.trim(), position }))}
              className="bg-rouge text-white hover:bg-rouge/90"
            >
              {busy ? "Enregistrement…" : "Enregistrer"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Supprimer le module ${mod.title}`}
              onClick={() => run(onDelete)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-3 border-t border-rose-doux pt-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base text-rouge">Leçons ({mod.lessons.length})</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const name = prompt("Titre de la leçon ?");
                if (!name?.trim()) return;
                run(() =>
                  onLessonSave({
                    module_id: mod.id,
                    title: name.trim(),
                    position: Math.max(-1, ...mod.lessons.map((lesson) => lesson.position)) + 1,
                    body: "",
                    resources: [],
                  }),
                );
              }}
            >
              <Plus className="size-4" />
              Ajouter
            </Button>
          </div>
          {mod.lessons.map((lesson) => (
            <LessonEditor
              key={lesson.id}
              lesson={lesson}
              onSave={(payload) => onLessonSave({ ...payload, module_id: mod.id, id: lesson.id })}
              onDelete={() => onLessonDelete(lesson.id)}
            />
          ))}
        </div>
      </fieldset>
    </Card>
  );
}

function ResourceFields({
  resources,
  onChange,
}: {
  resources: Resource[];
  onChange: (resources: Resource[]) => void;
}) {
  const prefix = useId();
  return (
    <div className="space-y-3">
      {resources.map((resource, index) => (
        <div
          key={index}
          className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-xl border border-rose-doux bg-white p-3 sm:grid-cols-[1fr_1fr_auto]"
        >
          <div>
            <Label htmlFor={`${prefix}-label-${index}`} className="text-xs">
              Nom de la ressource
            </Label>
            <Input
              id={`${prefix}-label-${index}`}
              value={resource.label}
              onChange={(event) =>
                onChange(
                  resources.map((item, i) =>
                    i === index ? { ...item, label: event.target.value } : item,
                  ),
                )
              }
            />
          </div>
          <div className="col-start-1 sm:col-start-auto">
            <Label htmlFor={`${prefix}-url-${index}`} className="text-xs">
              Lien
            </Label>
            <Input
              id={`${prefix}-url-${index}`}
              type="url"
              placeholder="https://…"
              value={resource.url}
              onChange={(event) =>
                onChange(
                  resources.map((item, i) =>
                    i === index ? { ...item, url: event.target.value } : item,
                  ),
                )
              }
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Retirer la ressource ${resource.label || index + 1}`}
            className="col-start-2 row-start-1 sm:col-start-auto sm:self-end"
            onClick={() => onChange(resources.filter((_, i) => i !== index))}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onChange([...resources, { label: "", url: "" }])}
      >
        <Plus className="size-4" />
        Ajouter une ressource
      </Button>
    </div>
  );
}

function LessonEditor({
  lesson,
  onSave,
  onDelete,
}: {
  lesson: LessonData;
  onSave: (payload: Omit<LessonPayload, "module_id">) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [title, setTitle] = useState(lesson.title);
  const [position, setPosition] = useState(lesson.position);
  const [body, setBody] = useState(lesson.body ?? "");
  const [intro, setIntro] = useState(lesson.intro ?? "");
  const [videos, setVideos] = useState(
    (Array.isArray(lesson.videos) ? (lesson.videos as string[]) : []).join("\n"),
  );
  const [steps, setSteps] = useState<Step[]>(
    (Array.isArray(lesson.steps) ? (lesson.steps as Step[]) : []).map((step) => ({
      title: step.title ?? "",
      body: step.body ?? "",
      resources: step.resources ?? [],
    })),
  );
  const [resources, setResources] = useState<Resource[]>(
    (Array.isArray(lesson.resources) ? (lesson.resources as RawResource[]) : []).map(
      normalizeResource,
    ),
  );
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const prefix = `lesson-${lesson.id}`;
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  const patchStep = (index: number, patch: Partial<Step>) =>
    setSteps((items) => items.map((step, i) => (i === index ? { ...step, ...patch } : step)));

  return (
    <div className="rounded-xl border border-rose-doux bg-rose-pale p-3 sm:p-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={`${prefix}-editor`}
        className="flex min-h-10 w-full items-center justify-between gap-3 text-left text-sm text-rouge"
      >
        <span className="min-w-0 break-words font-medium">{title || "Sans titre"}</span>
        <ChevronDown className={`size-4 shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <form
          id={`${prefix}-editor`}
          onSubmit={(event) => {
            event.preventDefault();
            run(() =>
              onSave({
                title: title.trim(),
                position,
                body,
                intro,
                videos: videos
                  .split("\n")
                  .map((value) => value.trim())
                  .filter(Boolean),
                steps,
                resources,
              }),
            );
          }}
          className="mt-4"
        >
          <fieldset disabled={busy} className="space-y-5">
            <div className="grid grid-cols-[minmax(0,1fr)_80px] gap-3">
              <div>
                <Label htmlFor={`${prefix}-title`}>Titre</Label>
                <Input
                  id={`${prefix}-title`}
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-2 bg-white"
                />
              </div>
              <div>
                <Label htmlFor={`${prefix}-order`}>Ordre</Label>
                <Input
                  id={`${prefix}-order`}
                  type="number"
                  step="1"
                  required
                  value={position}
                  onChange={(event) => setPosition(Number(event.target.value))}
                  className="mt-2 bg-white"
                />
              </div>
            </div>
            <div>
              <Label htmlFor={`${prefix}-intro`}>Introduction</Label>
              <Textarea
                id={`${prefix}-intro`}
                value={intro}
                onChange={(event) => setIntro(event.target.value)}
                rows={4}
                className="mt-2 bg-white"
              />
            </div>
            <div>
              <Label htmlFor={`${prefix}-videos`}>Vidéos — un lien par ligne</Label>
              <Textarea
                id={`${prefix}-videos`}
                value={videos}
                onChange={(event) => setVideos(event.target.value)}
                rows={3}
                className="mt-2 bg-white"
              />
            </div>
            <div>
              <Label htmlFor={`${prefix}-body`}>Contenu de la leçon</Label>
              <p className="my-2 text-xs text-muted-foreground">
                Mise en forme Markdown : ## pour un titre, - pour une liste, **texte** pour le gras.
              </p>
              <Textarea
                id={`${prefix}-body`}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={8}
                className="bg-white"
              />
            </div>
            <section className="space-y-3">
              <h3 className="text-base text-rouge">Étapes ({steps.length})</h3>
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="space-y-3 rounded-xl border border-rose-doux bg-white p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-rouge">Étape {index + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Retirer l’étape ${index + 1}`}
                      onClick={() => {
                        if (
                          confirm(
                            "Retirer cette étape ? La suppression sera appliquée à l’enregistrement.",
                          )
                        )
                          setSteps((items) => items.filter((_, i) => i !== index));
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <Label htmlFor={`${prefix}-step-${index}-title`}>Titre de l’étape</Label>
                  <Input
                    id={`${prefix}-step-${index}-title`}
                    value={step.title}
                    onChange={(event) => patchStep(index, { title: event.target.value })}
                  />
                  <Label htmlFor={`${prefix}-step-${index}-body`}>Contenu de l’étape</Label>
                  <Textarea
                    id={`${prefix}-step-${index}-body`}
                    value={step.body}
                    onChange={(event) => patchStep(index, { body: event.target.value })}
                    rows={4}
                  />
                  <ResourceFields
                    resources={step.resources.map(normalizeResource)}
                    onChange={(value) => patchStep(index, { resources: value })}
                  />
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setSteps((items) => [...items, { title: "", body: "", resources: [] }])
                }
              >
                <Plus className="size-4" />
                Ajouter une étape
              </Button>
            </section>
            <section className="space-y-3">
              <h3 className="text-base text-rouge">Ressources de la leçon</h3>
              <ResourceFields resources={resources} onChange={setResources} />
            </section>
            <div className="flex flex-wrap justify-end gap-2 border-t border-rose-doux pt-4">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`Supprimer la leçon ${lesson.title}`}
                onClick={() => run(onDelete)}
              >
                <Trash2 className="size-4" />
                Supprimer
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!title.trim()}
                className="bg-rouge text-white hover:bg-rouge/90"
              >
                {busy ? "Enregistrement…" : "Enregistrer la leçon"}
              </Button>
            </div>
          </fieldset>
        </form>
      )}
    </div>
  );
}

function ImportPanel() {
  const doImport = useServerFn(importSeed);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [replace, setReplace] = useState(false);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      toast.error("JSON invalide");
      return;
    }
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("modules" in parsed) ||
      !Array.isArray(parsed.modules) ||
      !parsed.modules.length
    ) {
      toast.error("Ajoute au moins un module dans le fichier JSON.");
      return;
    }
    if (
      replace &&
      !confirm(
        "Remplacer toute la formation ? Les anciennes leçons et les progressions associées seront supprimées. Cette action est irréversible.",
      )
    )
      return;
    setLoading(true);
    try {
      const res = await doImport({ data: { ...parsed, replace } });
      toast.success(`Import terminé : ${res.modules} modules, ${res.lessons} leçons`);
      setText("");
      qc.invalidateQueries({ queryKey: ["admin-modules"] });
      qc.invalidateQueries({ queryKey: ["modules"] });
      qc.invalidateQueries({ queryKey: ["lesson"] });
      qc.invalidateQueries({ queryKey: ["progress"] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 border-[#FFD6E8] space-y-4">
      <div>
        <Label htmlFor="import-json" className="text-[#91014B]">
          Importer une formation (JSON)
        </Label>
        <p className="text-sm text-muted-foreground mb-2">
          Format attendu :{" "}
          <code className="text-xs">
            {
              "{ modules: [{ title, position, lessons: [{ title, position, body, resources: [{ label, url }] }] }] }"
            }
          </code>
        </p>
        <Textarea
          id="import-json"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={18}
          className="font-mono text-xs border-[#FFD6E8]"
          placeholder='{ "modules": [...] }'
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
        Remplacer tout le contenu et supprimer les progressions associées
      </label>
      <Button
        onClick={run}
        disabled={loading || !text.trim()}
        className="bg-rouge hover:bg-rouge/90 text-white"
      >
        {loading ? "Import…" : "Importer"}
      </Button>
    </Card>
  );
}
