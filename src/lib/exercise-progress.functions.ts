import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { withExerciseIds, type Exercise } from "./exercises";

const lessonInput = z.object({ lesson_id: z.string().uuid() });

export const listExerciseProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { lesson_id: string }) => lessonInput.parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("exercise_progress")
      .select("exercise_id, completed_at")
      .eq("user_id", context.userId)
      .eq("lesson_id", data.lesson_id);
    if (error) throw new Error("Le suivi des exercices est momentanément indisponible.");
    return rows ?? [];
  });

export const setExerciseCompleted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { lesson_id: string; exercise_id: string; completed: boolean }) =>
    lessonInput.extend({ exercise_id: z.string().min(1).max(80), completed: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: lesson, error: accessError } = await context.supabase
      .from("lessons")
      .select("steps")
      .eq("id", data.lesson_id)
      .maybeSingle();
    if (accessError) throw new Error(accessError.message);
    const steps = Array.isArray(lesson?.steps) ? (lesson.steps as Exercise[]) : [];
    if (!lesson || !withExerciseIds(steps).some((step) => step.id === data.exercise_id)) {
      throw new Error("Cet exercice n’est plus accessible. Recharge la leçon.");
    }
    const completed_at = new Date().toISOString();
    const query = context.supabase.from("exercise_progress");
    const { error } = data.completed
      ? await query.upsert(
          {
            user_id: context.userId,
            lesson_id: data.lesson_id,
            exercise_id: data.exercise_id,
            completed_at,
          },
          { onConflict: "user_id,lesson_id,exercise_id" },
        )
      : await query
          .delete()
          .eq("user_id", context.userId)
          .eq("lesson_id", data.lesson_id)
          .eq("exercise_id", data.exercise_id);
    if (error) throw new Error("La progression n’a pas été enregistrée. Réessaie.");
    return { exercise_id: data.exercise_id, completed_at, completed: data.completed };
  });
