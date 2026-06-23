import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("lesson_progress")
      .select("lesson_id, completed_at")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const markLessonCompleted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { lesson_id: string }) => z.object({ lesson_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("lesson_progress")
      .upsert(
        { user_id: context.userId, lesson_id: data.lesson_id, completed_at: new Date().toISOString() },
        { onConflict: "user_id,lesson_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unmarkLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { lesson_id: string }) => z.object({ lesson_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("lesson_progress")
      .delete()
      .eq("user_id", context.userId)
      .eq("lesson_id", data.lesson_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
