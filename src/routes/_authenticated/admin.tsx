import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
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
  listModulesWithLessons,
  upsertModule,
  upsertLesson,
  deleteLesson,
  deleteModule,
  importSeed,
} from "@/lib/content.functions";
import { listMembers, addMembers, removeMember, getMyAccess } from "@/lib/members.functions";
import { Trash2, Plus } from "lucide-react";

const accessQO = (fn: any) =>
  queryOptions({ queryKey: ["access"], queryFn: () => fn() });
const modulesQO = (fn: any) =>
  queryOptions({ queryKey: ["admin-modules"], queryFn: () => fn() });
const membersQO = (fn: any) =>
  queryOptions({ queryKey: ["admin-members"], queryFn: () => fn() });

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
          <Button className="mt-4 bg-[#FB3D80] hover:bg-[#91014B] text-white" onClick={() => navigate({ to: "/accueil" })}>
            Retour au sommaire
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF4F8]">
      <Header isAdmin />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="font-display text-4xl text-[#91014B] mb-8">Espace admin</h1>
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="bg-white border border-[#FFD6E8]">
            <TabsTrigger value="members">Membres</TabsTrigger>
            <TabsTrigger value="content">Contenu</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>
          <TabsContent value="members" className="mt-6"><MembersPanel /></TabsContent>
          <TabsContent value="content" className="mt-6"><ContentPanel /></TabsContent>
          <TabsContent value="import" className="mt-6"><ImportPanel /></TabsContent>
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
    const emails = raw
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (!emails.length) {
      toast.error("Aucun email valide détecté");
      return;
    }
    setLoading(true);
    try {
      const res = await doAdd({ data: { emails } });
      const ok = res.results.filter((r) => r.status !== "error").length;
      const fail = res.results.filter((r) => r.status === "error");
      toast.success(`${ok} membre(s) ajouté(s)`);
      if (fail.length) {
        toast.error(`${fail.length} échec(s)`, {
          description: fail.map((f) => `${f.email} — ${f.message}`).join("\n").slice(0, 300),
        });
      }
      setRaw("");
      qc.invalidateQueries({ queryKey: ["admin-members"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
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
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    }
  };

  return (
    <div className="space-y-8">
      <Card className="p-6 border-[#FFD6E8]">
        <Label className="text-[#91014B] mb-2 block">Ajouter des membres</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Colle une liste d'emails (un par ligne ou séparés par virgules). Chaque personne reçoit un email d'invitation avec un lien de connexion.
        </p>
        <Textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="prenom1@exemple.com&#10;prenom2@exemple.com"
          rows={6}
          className="border-[#FFD6E8] focus-visible:ring-[#FB3D80]"
        />
        <Button
          onClick={handleAdd}
          disabled={loading}
          className="mt-4 bg-[#FB3D80] hover:bg-[#91014B] text-white"
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
            members.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-foreground">{m.email}</p>
                  {m.full_name && <p className="text-xs text-muted-foreground">{m.full_name}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
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

type Resource = { label: string; url: string };

function ContentPanel() {
  const fetchModules = useServerFn(listModulesWithLessons);
  const doUpsertModule = useServerFn(upsertModule);
  const doUpsertLesson = useServerFn(upsertLesson);
  const doDeleteLesson = useServerFn(deleteLesson);
  const doDeleteModule = useServerFn(deleteModule);
  const qc = useQueryClient();
  const { data: modules } = useSuspenseQuery(modulesQO(fetchModules));

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-modules"] });

  const createModule = async () => {
    const title = prompt("Titre du module ?");
    if (!title) return;
    try {
      await doUpsertModule({ data: { title, position: modules.length } });
      refresh();
      toast.success("Module créé");
    } catch (e: any) { toast.error(e?.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={createModule} className="bg-[#FB3D80] hover:bg-[#91014B] text-white">
          <Plus className="h-4 w-4 mr-2" /> Nouveau module
        </Button>
      </div>
      {modules.length === 0 ? (
        <Card className="p-8 border-[#FFD6E8] text-center text-muted-foreground">
          Aucun module pour l'instant. Crée-en un, ou importe le seed JSON dans l'onglet Import.
        </Card>
      ) : (
        modules.map((m: any) => (
          <ModuleEditor
            key={m.id}
            module={m}
            onSave={async (changes: { title: string; position: number }) => {
              await doUpsertModule({ data: { id: m.id, title: changes.title, position: changes.position } });
              refresh();
              toast.success("Module enregistré");
            }}
            onDelete={async () => {
              if (!confirm("Supprimer ce module et toutes ses leçons ?")) return;
              await doDeleteModule({ data: { id: m.id } });
              refresh();
              toast.success("Module supprimé");
            }}
            onLessonSave={async (lesson: any) => {
              await doUpsertLesson({ data: lesson });
              refresh();
              toast.success("Leçon enregistrée");
            }}
            onLessonDelete={async (id: string) => {
              if (!confirm("Supprimer cette leçon ?")) return;
              await doDeleteLesson({ data: { id } });
              refresh();
              toast.success("Leçon supprimée");
            }}
          />
        ))
      )}
    </div>
  );
}

function ModuleEditor({ module: mod, onSave, onDelete, onLessonSave, onLessonDelete }: any) {
  const [title, setTitle] = useState(mod.title);
  const [position, setPosition] = useState(mod.position);

  return (
    <Card className="p-6 border-[#FFD6E8] space-y-4">
      <div className="flex gap-3 items-start">
        <div className="flex-1">
          <Label className="text-[#91014B]">Titre</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="border-[#FFD6E8]" />
        </div>
        <div className="w-24">
          <Label className="text-[#91014B]">Position</Label>
          <Input type="number" value={position} onChange={(e) => setPosition(Number(e.target.value))} className="border-[#FFD6E8]" />
        </div>
        <div className="pt-6 flex gap-2">
          <Button size="sm" onClick={() => onSave({ title, position })} className="bg-[#FB3D80] hover:bg-[#91014B] text-white">
            Enregistrer
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} className="text-[#91014B]">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border-t border-[#FFD6E8] pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-[#91014B]">Leçons ({mod.lessons.length})</h4>
          <Button
            size="sm"
            variant="outline"
            className="border-[#FFD6E8] text-[#91014B]"
            onClick={() => {
              const t = prompt("Titre de la leçon ?");
              if (!t) return;
              onLessonSave({
                module_id: mod.id,
                title: t,
                position: mod.lessons.length,
                body: "",
                resources: [],
              });
            }}
          >
            <Plus className="h-3 w-3 mr-1" /> Ajouter
          </Button>
        </div>
        {mod.lessons.map((l: any) => (
          <LessonEditor
            key={l.id}
            lesson={l}
            onSave={(payload: any) => onLessonSave({ ...payload, module_id: mod.id, id: l.id })}
            onDelete={() => onLessonDelete(l.id)}
          />
        ))}
      </div>
    </Card>
  );
}

function LessonEditor({ lesson, onSave, onDelete }: any) {
  const [title, setTitle] = useState(lesson.title);
  const [position, setPosition] = useState(lesson.position);
  const [body, setBody] = useState(lesson.body ?? "");
  const [resources, setResources] = useState<Resource[]>(
    Array.isArray(lesson.resources) ? lesson.resources : [],
  );
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-[#FFD6E8] bg-[#FFF4F8] p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex justify-between items-center"
      >
        <span className="text-sm text-foreground">{title || "(sans titre)"}</span>
        <span className="text-xs text-muted-foreground">#{position}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="text-xs text-[#91014B]">Titre</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="border-[#FFD6E8] bg-white" />
            </div>
            <div className="w-20">
              <Label className="text-xs text-[#91014B]">Position</Label>
              <Input
                type="number"
                value={position}
                onChange={(e) => setPosition(Number(e.target.value))}
                className="border-[#FFD6E8] bg-white"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-[#91014B]">Contenu (markdown)</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="border-[#FFD6E8] bg-white font-mono text-xs"
            />
          </div>
          <div>
            <Label className="text-xs text-[#91014B]">Ressources</Label>
            <div className="space-y-2">
              {resources.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder="Label"
                    value={r.label}
                    onChange={(e) => {
                      const next = [...resources];
                      next[i] = { ...r, label: e.target.value };
                      setResources(next);
                    }}
                    className="border-[#FFD6E8] bg-white"
                  />
                  <Input
                    placeholder="https://…"
                    value={r.url}
                    onChange={(e) => {
                      const next = [...resources];
                      next[i] = { ...r, url: e.target.value };
                      setResources(next);
                    }}
                    className="border-[#FFD6E8] bg-white"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setResources(resources.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                className="border-[#FFD6E8] text-[#91014B]"
                onClick={() => setResources([...resources, { label: "", url: "" }])}
              >
                + Ajouter une ressource
              </Button>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={onDelete} className="text-[#91014B]">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={() =>
                onSave({
                  title,
                  position,
                  body,
                  resources: resources.filter((r) => r.label && r.url),
                })
              }
              className="bg-[#FB3D80] hover:bg-[#91014B] text-white"
            >
              Enregistrer
            </Button>
          </div>
        </div>
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
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      toast.error("JSON invalide");
      return;
    }
    setLoading(true);
    try {
      const res = await doImport({ data: { ...parsed, replace } });
      toast.success(`Import terminé : ${res.modules} modules, ${res.lessons} leçons`);
      setText("");
      qc.invalidateQueries({ queryKey: ["admin-modules"] });
      qc.invalidateQueries({ queryKey: ["modules"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 border-[#FFD6E8] space-y-4">
      <div>
        <Label className="text-[#91014B]">Seed JSON</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Format attendu :{" "}
          <code className="text-xs">
            {"{ modules: [{ title, position, lessons: [{ title, position, body, resources: [{ label, url }] }] }] }"}
          </code>
        </p>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={18}
          className="font-mono text-xs border-[#FFD6E8]"
          placeholder='{ "modules": [...] }'
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
        Remplacer tout le contenu existant (les modules actuels seront supprimés)
      </label>
      <Button onClick={run} disabled={loading} className="bg-[#FB3D80] hover:bg-[#91014B] text-white">
        {loading ? "Import…" : "Importer"}
      </Button>
    </Card>
  );
}
