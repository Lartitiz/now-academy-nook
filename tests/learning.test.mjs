import test from "node:test";
import assert from "node:assert/strict";
import {
  learningSummary,
  videoEmbed,
  safeHttpUrl,
  normalizeResource,
} from "../src/lib/learning.ts";
const modules = [
  {
    id: "module",
    title: "Module",
    position: 0,
    lessons: [
      { id: "a", title: "Première", position: 0, module_id: "module" },
      { id: "b", title: "Deuxième", position: 1, module_id: "module" },
    ],
  },
];
test("la progression ignore les leçons supprimées et les doublons", () => {
  const summary = learningSummary(modules, [
    { lesson_id: "a" },
    { lesson_id: "a" },
    { lesson_id: "ancienne" },
  ]);
  assert.equal(summary.done, 1);
  assert.equal(summary.percent, 50);
  assert.equal(summary.next.id, "b");
});
test("aucun contenu et une formation terminée ont des états distincts", () => {
  assert.equal(learningSummary([], []).percent, 0);
  const done = learningSummary(modules, [{ lesson_id: "a" }, { lesson_id: "b" }]);
  assert.equal(done.percent, 100);
  assert.equal(done.next, undefined);
});
test("une leçon remise en cours est proposée de nouveau", () => {
  assert.equal(learningSummary(modules, [{ lesson_id: "b" }]).next.id, "a");
});
test("YouTube accepte les paramètres dans tout ordre, les Shorts et les liens courts", () => {
  const base = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ";
  assert.equal(videoEmbed("https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ"), base);
  assert.equal(videoEmbed("https://youtube.com/shorts/dQw4w9WgXcQ"), base);
  assert.equal(videoEmbed("https://youtu.be/dQw4w9WgXcQ?t=42"), `${base}?start=42`);
  assert.equal(
    videoEmbed("https://www.loom.com/share/abc123"),
    "https://www.loom.com/embed/abc123",
  );
});
test("les domaines ressemblants et les URL exécutables ne deviennent pas des vidéos", () => {
  for (const url of [
    "https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ",
    "https://evil.test/youtube.com/embed/dQw4w9WgXcQ",
    "javascript:alert(1)",
    "data:text/html,hello",
    "https://youtu.be/invalid",
  ])
    assert.equal(videoEmbed(url), null);
  assert.equal(safeHttpUrl("javascript:alert(1)"), null);
  assert.equal(safeHttpUrl("data:text/html,hello"), null);
  assert.equal(safeHttpUrl("https://example.com/resource"), "https://example.com/resource");
});
test("les ressources historiques au format texte restent éditables sans perte", () => {
  const url = "https://www.canva.com/design/original";
  assert.deepEqual(normalizeResource(url), { label: "Ressource Canva", url });
  assert.deepEqual(normalizeResource({ label: "", url }), { label: "Ressource", url });
});
