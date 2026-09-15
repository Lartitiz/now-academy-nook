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
- Confirmation d’inscription correctement attendue ; erreurs de connexion dans le formulaire ; cache purgé lors d’un changement de compte.
- Import préparé avant la suppression du contenu précédent, avec nettoyage des ajouts partiels en cas d’échec d’insertion. Une erreur après tentative de remplacement conserve toujours la nouvelle copie. Ce mécanisme n’est pas une transaction SQL et ne protège pas de tous les scénarios d’interruption ou d’imports concurrents.

### Décision d’accès en attente

`getMyAccess` conserve l’inscription automatique actuelle. Chaque compte connecté reçoit un accès membre. Supprimer un membre ne constitue donc pas une révocation durable : sa prochaine visite le réinscrit. Confirmer la politique d’inscription avant la mise en production d’un espace strictement privé.

### Limites de recette

Les parcours ont été manipulés dans un navigateur sur ordinateur et mobile, avec une copie isolée utilisant une authentification et une base en mémoire. Les composants et fonctions applicatives sont ceux du projet ; les adaptateurs Supabase seuls sont simulés. Aucun email réel, contenu de production, rôle réel ou migration distante n’a été modifié. La réception des emails, les règles RLS en ligne, les lecteurs tiers et la publication Lovable restent à vérifier dans leur environnement réel.
