import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { withExerciseIds, type Exercise } from "./exercises";

const ResourceSchema = z.union([z.string(), z.object({ label: z.string(), url: z.string() })]);

const StepSeed = z.object({
  id: z.string().min(1).max(80).optional(),
  title: z.string().default(""),
  body: z.string().default(""),
  resources: z.array(ResourceSchema).default([]),
});

const LessonSeed = z.object({
  title: z.string(),
  position: z.number().int().default(0),
  body: z.string().default(""),
  intro: z.string().default(""),
  videos: z.array(z.string()).default([]),
  steps: z.array(StepSeed).default([]),
  resources: z.array(ResourceSchema).default([]),
});

const ModuleSeed = z.object({
  title: z.string(),
  position: z.number().int().default(0),
  lessons: z.array(LessonSeed).default([]),
});

const SeedSchema = z.object({
  modules: z.array(ModuleSeed).min(1, "Ajoute au moins un module avant d’importer."),
  replace: z.boolean().optional().default(false),
});

async function assertAdmin(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const listModulesWithLessons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: modules, error } = await supabase
      .from("modules")
      .select("id, title, position, lessons(id, title, position, module_id)")
      .order("position", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw new Error(error.message);
    return (modules ?? []).map((m) => ({
      ...m,
      lessons: [...(m.lessons ?? [])].sort(
        (a, b) => a.position - b.position || a.id.localeCompare(b.id),
      ),
    }));
  });

// The editor must receive the full lesson: saving a summary would erase its body/resources.
export const listAdminModules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("modules")
      .select(
        "id, title, position, lessons(id, module_id, title, position, body, intro, videos, steps, resources)",
      )
      .order("position", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((module) => ({
      ...module,
      lessons: module.lessons
        .map((lesson) => ({
          ...lesson,
          steps: withExerciseIds((lesson.steps ?? []) as Exercise[]),
        }))
        .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)),
    }));
  });

export const getLesson = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: lesson, error } = await supabase
      .from("lessons")
      .select(
        "id, module_id, title, position, body, intro, videos, steps, resources, modules(id, title, position)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!lesson) throw notFound();

    const { data: all, error: allErr } = await supabase
      .from("lessons")
      .select("id, position, module_id, modules(position)");
    if (allErr) throw new Error(allErr.message);
    const ordered = (all ?? [])
      .map((l) => ({
        id: l.id,
        module_id: l.module_id,
        mod: l.modules?.position ?? 0,
        pos: l.position,
      }))
      .sort(
        (a, b) =>
          a.mod - b.mod ||
          a.module_id.localeCompare(b.module_id) ||
          a.pos - b.pos ||
          a.id.localeCompare(b.id),
      );
    const idx = ordered.findIndex((l) => l.id === data.id);
    const prev = idx > 0 ? ordered[idx - 1].id : null;
    const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1].id : null;

    return {
      lesson: { ...lesson, steps: withExerciseIds((lesson.steps ?? []) as Exercise[]) },
      prev,
      next,
    };
  });

export const upsertModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; title: string; position: number }) =>
    z
      .object({
        id: z.string().uuid().optional(),
        title: z.string().trim().min(1),
        position: z.number().int(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("modules").upsert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        module_id: z.string().uuid(),
        title: z.string().trim().min(1),
        position: z.number().int(),
        body: z.string(),
        intro: z.string().optional(),
        videos: z.array(z.string()).optional(),
        steps: z.array(StepSeed).optional(),
        resources: z.array(ResourceSchema),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("lessons")
      .upsert({ ...data, ...(data.steps ? { steps: withExerciseIds(data.steps) } : {}) });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("lessons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("modules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const importSeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SeedSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Stage new content first. A failed import must not delete the existing course.
    const previousIds: string[] = [];
    if (data.replace) {
      const { data: previous, error } = await supabaseAdmin.from("modules").select("id");
      if (error) throw new Error(error.message);
      previousIds.push(...(previous ?? []).map((module) => module.id));
    }
    const createdIds: string[] = [];
    let imported = 0;
    try {
      for (const mod of data.modules) {
        const { data: module, error } = await supabaseAdmin
          .from("modules")
          .insert({ title: mod.title, position: mod.position })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        createdIds.push(module.id);
        if (mod.lessons.length) {
          const { error } = await supabaseAdmin.from("lessons").insert(
            mod.lessons.map((lesson) => ({
              module_id: module.id,
              title: lesson.title,
              position: lesson.position,
              body: lesson.body,
              intro: lesson.intro,
              videos: lesson.videos,
              steps: lesson.steps.map((step) => ({ ...step, id: crypto.randomUUID() })),
              resources: lesson.resources,
            })),
          );
          if (error) throw new Error(error.message);
          imported += mod.lessons.length;
        }
      }
    } catch (error) {
      if (createdIds.length) {
        const { error: cleanupError } = await supabaseAdmin
          .from("modules")
          .delete()
          .in("id", createdIds);
        if (cleanupError)
          throw new Error(
            "Import interrompu. Le contenu précédent est conservé, mais des modules partiels ont été ajoutés. Vérifie le programme avant de réessayer.",
          );
      }
      throw error;
    }
    // Never roll back the new copy after attempting deletion: a network timeout
    // could mean the old copy was deleted successfully despite the error response.
    if (previousIds.length) {
      const { error } = await supabaseAdmin.from("modules").delete().in("id", previousIds);
      if (error)
        throw new Error(
          "Les nouveaux modules sont conservés. Le remplacement de l’ancien contenu n’a pas pu être confirmé : vérifie le programme avant de relancer un import.",
        );
    }
    return { ok: true, modules: data.modules.length, lessons: imported };
  });
