# Now’ Academy

Espace de formation construit avec TanStack Start, React, Tailwind et Supabase.

## Développement

```sh
bun install --frozen-lockfile
bun run dev
```

Utiliser les variables Supabase du projet pour le navigateur et le serveur. Les opérations administratives nécessitent aussi `SUPABASE_SERVICE_ROLE_KEY` **uniquement côté serveur**, et `SITE_URL` pour les liens d’invitation. Ne jamais préfixer la clé de service par `VITE_`.

## Vérifications

```sh
bun run typecheck
bun run build
npm test
```

Les tests utilisent Node.js 22.6+ pour importer les helpers TypeScript. `bun run lint` applique également les règles au code préexistant ; des erreurs de formatage et de typage `any` subsistent dans des fichiers hors de cet audit.

## Audit UX/UI du 15 septembre 2026

- Accueil avec progression calculée, prochaine leçon, recherche sans accents et programme dépliable.
- Éditeur administratif chargé avec les leçons complètes. Introduction, vidéos, étapes et ressources conservées et éditables.
- Progression réversible, menu mobile accessible au clavier, mise en forme Markdown, liens vidéo normalisés.
- Formulaire de connexion affiché une fois prêt côté navigateur, pour éviter une réinitialisation de saisie lors de son initialisation. Confirmation d’inscription correctement attendue ; erreurs de connexion dans le formulaire ; cache purgé lors d’un changement de compte.
- Import préparé avant la suppression du contenu précédent, avec nettoyage des ajouts partiels en cas d’échec d’insertion. Une erreur après tentative de remplacement conserve toujours la nouvelle copie. Ce mécanisme n’est pas une transaction SQL et ne protège pas de tous les scénarios d’interruption ou d’imports concurrents.

### Inscription ouverte — choix confirmé

Toute personne qui crée son compte peut accéder à la formation. L’inscription automatique existante est conservée, conformément au choix de Laetitia du 15 septembre 2026.

### Lecture et suivi des exercices

- Titres en gras, sous-titres repérés, paragraphes aérés et listes lisibles. La passe s’applique à l’affichage : les textes et liens enregistrés sont conservés. Le Markdown structuré de l’éditeur reste respecté.
- Une case par exercice, un compteur dans chaque leçon et une sauvegarde par compte. Cocher des exercices ne modifie pas automatiquement la validation de la leçon.
- Les identifiants historiques sont matérialisés à la lecture dans l’éditeur, puis conservés à la sauvegarde : renommer ou supprimer une étape ne transfère pas la coche à la suivante. Les nouvelles étapes reçoivent un identifiant UUID.
- En cas d’erreur du suivi, le contenu reste lisible et une nouvelle tentative est proposée. Une sauvegarde échouée n’affiche pas une coche enregistrée.

**Avant de publier cette version**, appliquer uniquement la nouvelle migration `supabase/migrations/20260915160000_exercise_progress.sql`. Elle ajoute la table et ses règles d’accès ; elle ne modifie ni les cours ni les progressions des leçons. Ne pas rejouer les anciennes migrations sur la production. La nouvelle migration a été testée dans une transaction annulée ; elle n’est pas encore appliquée durablement.

### Validation et limites

Les 37 leçons et 265 exercices réels ont été lus depuis la base puis copiés dans l’environnement de recette. Les essais de navigation, de sauvegarde et d’édition utilisent des comptes fictifs et une base en mémoire. Les composants et fonctions applicatives sont ceux du projet ; les adaptateurs Supabase seuls sont simulés. Les vérifications SQL du nouveau suivi (lecture, insertion, mise à jour, suppression, isolation entre comptes et rejet d’un exercice inexistant) ont réussi dans la base réelle, dans une transaction intégralement annulée.

Aucun email réel n’a été envoyé et aucune donnée distante n’a été modifiée durablement. La réception des emails, les lecteurs tiers et la publication Lovable restent à vérifier dans leur environnement réel. Les règles RLS des autres fonctionnalités ne sont pas couvertes par ce test SQL ciblé.
