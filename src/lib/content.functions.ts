import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ResourceSchema = z.object({
  label: z.string(),
  url: z.string().url(),
});

const LessonSeed = z.object({
  title: z.string(),
  position: z.number().int().default(0),
  body: z.string().default(""),
  resources: z.array(ResourceSchema).default([]),
});

const ModuleSeed = z.object({
  title: z.string(),
  position: z.number().int().default(0),
  lessons: z.array(LessonSeed).default([]),
});

const SeedSchema = z.object({
  modules: z.array(ModuleSeed),
  replace: z.boolean().optional().default(false),
});

async function assertAdmin(supabase: any, userId: string) {
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
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);
    return (modules ?? []).map((m: any) => ({
      ...m,
      lessons: [...(m.lessons ?? [])].sort((a: any, b: any) => a.position - b.position),
    }));
  });

export const getLesson = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: lesson, error } = await supabase
      .from("lessons")
      .select("id, module_id, title, position, body, resources, modules(id, title, position)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!lesson) throw new Error("Leçon introuvable");

    const { data: all, error: allErr } = await supabase
      .from("lessons")
      .select("id, position, module_id, modules(position)");
    if (allErr) throw new Error(allErr.message);
    const ordered = (all ?? [])
      .map((l: any) => ({ id: l.id, mod: l.modules?.position ?? 0, pos: l.position }))
      .sort((a, b) => a.mod - b.mod || a.pos - b.pos);
    const idx = ordered.findIndex((l) => l.id === data.id);
    const prev = idx > 0 ? ordered[idx - 1].id : null;
    const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1].id : null;

    return { lesson, prev, next };
  });

export const upsertModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; title: string; position: number }) =>
    z.object({ id: z.string().uuid().optional(), title: z.string().min(1), position: z.number().int() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("modules").upsert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z
      .object({
        id: z.string().uuid().optional(),
        module_id: z.string().uuid(),
        title: z.string().min(1),
        position: z.number().int(),
        body: z.string(),
        resources: z.array(ResourceSchema),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("lessons").upsert(data);
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
    if (data.replace) {
      const { error: delErr } = await supabaseAdmin
        .from("modules")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (delErr) throw new Error(delErr.message);
    }
    let imported = 0;
    for (const mod of data.modules) {
      const { data: m, error: mErr } = await supabaseAdmin
        .from("modules")
        .insert({ title: mod.title, position: mod.position })
        .select("id")
        .single();
      if (mErr) throw new Error(mErr.message);
      if (mod.lessons.length) {
        const rows = mod.lessons.map((l) => ({
          module_id: m.id,
          title: l.title,
          position: l.position,
          body: l.body,
          resources: l.resources,
        }));
        const { error: lErr } = await supabaseAdmin.from("lessons").insert(rows);
        if (lErr) throw new Error(lErr.message);
        imported += rows.length;
      }
    }
    return { ok: true, modules: data.modules.length, lessons: imported };
  });
