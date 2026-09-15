import { useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listExerciseProgress, setExerciseCompleted } from "@/lib/exercise-progress.functions";
import { withExerciseIds, type Exercise } from "@/lib/exercises";
import { ResourceList } from "./ResourceList";

export function ExerciseList({
  lessonId,
  userId,
  steps,
  renderBody,
}: {
  lessonId: string;
  userId: string;
  steps: Exercise[];
  renderBody: (body: string) => ReactNode;
}) {
  const fetchProgress = useServerFn(listExerciseProgress);
  const saveProgress = useServerFn(setExerciseCompleted);
  const queryClient = useQueryClient();
  const queryKey = ["exercise-progress", userId, lessonId];
  const progress = useQuery({
    queryKey,
    queryFn: () => fetchProgress({ data: { lesson_id: lessonId } }),
    retry: 1,
  });
  const busy = useRef(new Set<string>());
  const [saving, setSaving] = useState(new Set<string>());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const exercises = withExerciseIds(steps);
  const done = new Set(progress.data?.map((row) => row.exercise_id) ?? []);
  const count = exercises.filter((exercise) => done.has(exercise.id)).length;

  async function toggle(exerciseId: string, completed: boolean) {
    if (busy.current.has(exerciseId)) return;
    busy.current.add(exerciseId);
    setSaving(new Set(busy.current));
    setErrors((current) => ({ ...current, [exerciseId]: "" }));
    try {
      // Prevent a background refetch started before this write overwriting its result.
      await queryClient.cancelQueries({ queryKey });
      const result = await saveProgress({
        data: {
          lesson_id: lessonId,
          exercise_id: exerciseId,
          completed,
        },
      });
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData<Awaited<ReturnType<typeof fetchProgress>>>(queryKey, (rows = []) => {
        const others = rows.filter((row) => row.exercise_id !== exerciseId);
        return result.completed
          ? [
              ...others,
              {
                exercise_id: result.exercise_id,
                completed_at: result.completed_at,
              },
            ]
          : others;
      });
    } catch {
      setErrors((current) => ({
        ...current,
        [exerciseId]: "Pas enregistré. Vérifie ta connexion, puis réessaie.",
      }));
    } finally {
      busy.current.delete(exerciseId);
      setSaving(new Set(busy.current));
    }
  }

  return (
    <section aria-label="Exercices de la leçon" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h2 className="exercise-title text-lg text-rouge">Tes exercices</h2>
        <p role="status" className="text-sm text-rouge">
          {progress.isPending
            ? "Chargement du suivi…"
            : progress.isError
              ? "Suivi indisponible"
              : `${count} / ${exercises.length} ${count === 1 ? "exercice fait" : "exercices faits"}`}
        </p>
      </div>
      {progress.isError && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-doux bg-white p-4 text-sm text-rouge"
        >
          Le suivi n’a pas pu être chargé. Tu peux continuer à lire les exercices.
          <button
            className="ml-2 min-h-11 underline font-semibold"
            onClick={() => void progress.refetch()}
          >
            Réessayer
          </button>
        </div>
      )}
      {exercises.map((exercise, index) => {
        const checked = done.has(exercise.id);
        const pending = saving.has(exercise.id);
        const inputId = `exercise-${lessonId}-${exercise.id}`;
        return (
          <article
            key={exercise.id}
            className="exercise-card rounded-3xl bg-white border border-rose-doux shadow-sm p-5 sm:p-8 space-y-5"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={`inline-flex items-center justify-center h-8 w-8 rounded-full text-sm font-semibold shrink-0 ${checked ? "bg-jaune text-rouge" : "bg-framboise text-white"}`}
              >
                {index + 1}
              </span>
              <h3 className="exercise-title text-lg sm:text-xl text-rouge leading-snug m-0 pt-0.5">
                {exercise.title || `Exercice ${index + 1}`}
              </h3>
            </div>
            {exercise.body?.trim() && (
              <div className="lesson-prose exercise-prose">{renderBody(exercise.body)}</div>
            )}
            {!!exercise.resources?.length && <ResourceList resources={exercise.resources} />}
            <div className="border-t border-rose-doux pt-3">
              <label
                htmlFor={inputId}
                className="flex min-h-11 items-center gap-3 text-rouge font-semibold cursor-pointer"
              >
                <input
                  id={inputId}
                  type="checkbox"
                  checked={checked}
                  disabled={!progress.isSuccess || pending}
                  aria-label={`Exercice fait : ${exercise.title || index + 1}`}
                  aria-describedby={errors[exercise.id] ? `${inputId}-error` : undefined}
                  className="h-5 w-5 shrink-0 accent-[#91014b] disabled:opacity-50"
                  onChange={(event) => void toggle(exercise.id, event.target.checked)}
                />
                <span>
                  {pending
                    ? "Enregistrement…"
                    : checked
                      ? "Exercice fait"
                      : "J’ai fait cet exercice"}
                </span>
              </label>
              {errors[exercise.id] && (
                <p id={`${inputId}-error`} role="alert" className="text-sm text-rouge mt-2">
                  {errors[exercise.id]}
                </p>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
