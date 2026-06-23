
# Now' Academy — espace membres privé

Application TanStack Start + Tailwind + Lovable Cloud (Supabase). Accès réservé aux 56 inscrites, ton chaleureux et inclusif, identité visuelle framboise/rose.

## 1. Activation Lovable Cloud + schéma

Activation de Lovable Cloud, puis migration SQL :

- `modules` (id uuid, title text, position int, created_at)
- `lessons` (id uuid, module_id fk, title, position int, body text, resources jsonb, created_at)
- `members` (id uuid, user_id fk auth.users on delete cascade, full_name, created_at, unique user_id)
- `lesson_progress` (id, user_id, lesson_id fk, completed_at, unique(user_id, lesson_id))
- `app_role` enum (`admin`, `member`) + table `user_roles` + fonction `has_role(uuid, app_role)` security definer
- Fonction `is_member(uuid)` security definer

RLS :
- `modules` / `lessons` : SELECT autorisé si `is_member(auth.uid())` OU `has_role(auth.uid(), 'admin')`. INSERT/UPDATE/DELETE réservés aux admins.
- `members` : SELECT/INSERT/UPDATE/DELETE réservés aux admins ; un membre peut SELECT sa propre ligne.
- `user_roles` : SELECT par le user concerné ; gestion par admins.
- `lesson_progress` : l'utilisateur lit/écrit uniquement ses lignes (`user_id = auth.uid()`), à condition d'être membre.

GRANTs explicites `authenticated` + `service_role` sur chaque table publique.

L'email `laetitia@nowadaysagency.com` reçoit automatiquement le rôle `admin` (trigger `on_auth_user_created` qui ajoute la ligne dans `user_roles` si l'email correspond, et ajoute aussi une ligne dans `members`).

## 2. Identité visuelle

`src/styles.css` (Tailwind v4 tokens) :
- `--color-framboise: #FB3D80` (accent)
- `--color-rose-moyen: #FFA7C6`
- `--color-rose-doux: #FFD6E8`
- `--color-rose-pale: #FFF4F8` (fond par défaut)
- `--color-jaune: #FFE561`
- `--color-rouge: #91014B` (titres)
- `--font-display: "Libre Baskerville"` (jamais bold), `--font-sans: "IBM Plex Sans"`

Polices via `@fontsource/libre-baskerville` et `@fontsource/ibm-plex-sans` importées dans `src/styles.css` (compatible Vite Lightning CSS). Pas de cercles décoratifs ; cartes `rounded-2xl`, ombres douces, beaucoup d'air, écriture inclusive et tutoiement partout.

## 3. Routes et pages

Structure TanStack Start :

```
src/routes/
  __root.tsx                       header simple + Outlet
  index.tsx                        redirige selon auth (loader client)
  auth.tsx                         page de connexion magic link
  _authenticated/
    route.tsx                      géré par l'intégration Supabase
    accueil.tsx                    sommaire 7 modules dépliables + % progression
    lecon.$id.tsx                  contenu leçon + ressources + nav prev/next
    admin.tsx                      gate `has_role(admin)` + onglets Membres / Contenu / Import
```

- **/auth** : email-only, `signInWithOtp` (magic link) avec `emailRedirectTo` vers `/accueil`. Après login, si l'utilisateur n'est ni membre ni admin → message « Cet espace est réservé aux inscrit·es de la Now' Academy » et bouton de déconnexion. Pas de mot de passe, pas de page de signup publique.
- **/accueil** : header « Now' Academy » en Libre Baskerville, mot d'accueil chaleureux, liste des 7 modules en accordéon (shadcn Accordion). Chaque module affiche son % (leçons terminées / total) et la liste des leçons cliquables avec une coche pour les terminées.
- **/lecon/$id** : titre en Libre Baskerville rouge `#91014B`, body rendu (markdown léger via `react-markdown` + remark-gfm, paragraphes/listes/emojis), bloc « Ressources » qui détecte le type d'URL :
  - YouTube / Loom → iframe embed
  - Canva / Google Docs / autres → carte bouton « Ouvrir »
- Bouton « Marquer comme terminé » (upsert dans `lesson_progress`), navigation Précédent / Suivant calculée à partir de l'ordre global (module.position, lesson.position).
- **/admin** :
  - **Membres** : textarea pour coller une liste d'emails (1 par ligne ou séparés par virgules) → server fn admin qui pour chaque email appelle `supabaseAdmin.auth.admin.inviteUserByEmail` (envoie le magic link d'invitation) puis upsert la ligne `members`. Liste des membres existants avec suppression.
  - **Contenu** : éditer titres et positions des modules, éditer les leçons (titre, body markdown, ressources sous forme de liste `{label, url}`).
  - **Import seed** : zone de collage JSON `{ modules: [{ title, position, lessons: [{ title, position, body, resources }] }] }` → server fn admin qui efface (option) puis insère le contenu. C'est là que tu colles le JSON des 37 leçons.

## 4. Server functions

Dans `src/lib/` (jamais sous `src/server/`) :

- `members.functions.ts` — `listMembers`, `addMembers(emails[])`, `removeMember(id)` — `.middleware([requireSupabaseAuth])` + check `has_role admin` ; `supabaseAdmin` chargé via `await import` dans le handler.
- `content.functions.ts` — `listModulesWithLessons` (membre+admin), `upsertModule`, `upsertLesson`, `deleteLesson`, `deleteModule` (admin), `importSeed(json)` (admin).
- `progress.functions.ts` — `markLessonCompleted(lessonId)`, `unmarkLesson(lessonId)`, `listMyProgress` (membre via `requireSupabaseAuth`, écrit avec le client RLS).

Loaders publics (`/auth`) n'appellent aucune fonction protégée. Les loaders sous `_authenticated/` peuvent appeler les fonctions protégées (gate `ssr: false` géré par l'intégration).

`attachSupabaseAuth` ajouté dans `src/start.ts` (append au `functionMiddleware` existant).

## 5. Détails techniques

- TanStack Query déjà câblé : `ensureQueryData` dans les loaders + `useSuspenseQuery` dans les composants.
- `react-markdown` + `remark-gfm` pour le rendu du body (`bun add`).
- Détection embed via regex sur les URLs YouTube / Loom dans le composant `ResourceList`.
- Toasts (sonner déjà inclus) pour confirmations admin et marquage de leçon.
- `errorComponent` + `notFoundComponent` sur chaque route avec loader.
- Pas de polling auth, un seul `onAuthStateChange` dans `__root.tsx`.

## 6. Étapes après build

1. Tu te connectes une première fois avec `laetitia@nowadaysagency.com` → tu deviens admin auto.
2. Tu colles le JSON des 37 leçons dans **Admin → Import seed**.
3. Tu colles les 56 emails dans **Admin → Membres** → invitations magic link envoyées.

## Points hors scope volontairement

- Pas de paiement, pas de page de vente, pas d'inscription publique.
- Pas de vue admin de progression (membre uniquement, comme demandé).
- Pas de connexion par mot de passe (magic link uniquement).
