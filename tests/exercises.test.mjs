import test from "node:test";
import assert from "node:assert/strict";
import { withExerciseIds, formatExerciseBody } from "../src/lib/exercises.ts";

test("les coches suivent les exercices après renommage, suppression et réorganisation", () => {
  const original = [{ title: "Premier" }, { title: "Deuxième" }, { title: "Troisième" }];
  const steps = withExerciseIds(original);
  const saved = withExerciseIds([
    { ...steps[2], title: "Autre titre" },
    steps[0],
    { id: "new-exercise", title: "Nouveau" },
  ]);
  assert.deepEqual(
    saved.map((s) => s.id),
    ["step-3", "step-1", "new-exercise"],
  );
  assert.equal(original[0].id, undefined);
  assert.throws(() => withExerciseIds([{ id: "same" }, { id: "same" }]));
});

test("les consignes importées sont aérées, les titres distingués et les listes regroupées", () => {
  assert.equal(
    formatExerciseBody(
      "🎯 Le but ici\nUne première consigne.\nLa suite.\n✍️ Ta mission :\n• Une idée\n• Une autre\nÉtape 1 — Ouvre ton carnet",
    ),
    "**🎯 Le but ici**\n\nUne première consigne.\n\nLa suite.\n\n**✍️ Ta mission :**\n\n- Une idée\n- Une autre\n\n**Étape 1 — Ouvre ton carnet**",
  );
  assert.equal(
    formatExerciseBody("Objectif : rédiger ton histoire."),
    "**Objectif :** rédiger ton histoire.",
  );
});

test("le Markdown rédigé dans l’éditeur, les liens et les blocs de code restent intacts", () => {
  for (const value of [
    "## Titre\nTexte\n\n- A\n  - B",
    "```js\nconst x = 1;\n```",
    "Titre\n---\nTexte",
    "| A | B |\n|---|---|\n| 1 | 2 |",
    "> Citation\n> Suite",
    "1. Premier\n2. Deuxième",
    "    code\n    code",
    "[lien]: https://example.com",
  ]) {
    assert.equal(formatExerciseBody(value), value);
  }
  const url = "[Mon document](https://example.com/doc?a=1&b=2)";
  assert.ok(formatExerciseBody(`Prompt à utiliser\n${url}`).includes(url));
});

test("la mise en forme reste stable quand on la réapplique", () => {
  for (const value of [
    "Ta mission :\nÉcris une phrase.\nRelis-la.",
    "Astuce : essaie.\n• A\n• B",
    "",
    "​\nTexte",
  ]) {
    const formatted = formatExerciseBody(value);
    assert.equal(formatExerciseBody(formatted), formatted);
  }
});
