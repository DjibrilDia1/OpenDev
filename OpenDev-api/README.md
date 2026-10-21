# OpenDev API

Le [Dockerfile](Dockerfile) propose les cibles `development` et `production`, avec Python 3.12 et les dépendances figées par `uv.lock`. Depuis la racine du dépôt : `docker compose up -d --build --wait`. Voir [les instructions Docker](../README.md#docker--développement).

La CI dédiée est définie dans [api-ci.yml](../.github/workflows/api-ci.yml). Elle vérifie Ruff, les tests API, la construction du package, les images Docker et les migrations Supabase locales. Le workflow [deploy-database.yml](../.github/workflows/deploy-database.yml) applique les migrations distantes uniquement sur déclenchement manuel, après réussite de la CI API.

API métier FastAPI. Supabase Auth est la source d'identité, et Supabase Data API/PostgreSQL gère les données et leurs accès via RLS. Les routes protégées valident le jeton auprès de Supabase Auth; les requêtes aux tables transmettent ensuite le même jeton utilisateur afin que RLS continue de s'appliquer.

## Architecture

- `api/routes` : contrôleurs HTTP versionnés (couche Controller).
- `schemas` : validation des entrées et des réponses.
- `services` : règles métier et coordination des cas d'usage.
- `repositories` : accès aux modèles Supabase/PostgreSQL avec le jeton de l'utilisateur.
- `supabase/migrations` : modèles de données, vues, contraintes et politiques RLS (couche Model).

Les écrans React constituent la couche View. Ce découpage suit MVC tout en gardant les règles métier hors des routes.

Le navigateur gère les sessions Supabase. FastAPI ne reçoit jamais de clé `service_role` et ne se substitue pas aux politiques RLS.

## Démarrage local

Prérequis : Python 3.12+ et un projet Supabase.

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
Copy-Item .env.example .env
```

Renseigne `SUPABASE_URL` et `SUPABASE_PUBLISHABLE_KEY` dans `.env`, puis lance :

```powershell
uvicorn app.main:app --reload
```

Documentation interactive : `http://127.0.0.1:8000/docs`.
Contrôle de santé : `http://127.0.0.1:8000/api/v1/health`.

## Schéma Supabase

Les migrations locales sont dans `supabase/migrations`. Avec Supabase CLI installé et le projet lié :

```powershell
supabase login
supabase link --project-ref <PROJECT_REF>
supabase db push
```

Elles définissent les profils, communautés, publications, commentaires, réactions, projets, événements, vues de découverte et politiques RLS. Elles ne sont pas appliquées à un projet distant tant que celui-ci n'est pas lié.

## Endpoints initiaux

Toutes les routes sont préfixées par `/api/v1`. Les routes de création, modification, suppression et participation demandent `Authorization: Bearer <access_token_supabase>`.

| Domaine | Routes |
| --- | --- |
| Profil | `GET /me`, `GET /profiles/{username}`, `PATCH /profiles/me` |
| Découverte | `GET /discover/communities`, `/discover/projects`, `/discover/people`, `/discover/tags` |
| Communautés | `GET /communities/{slug}`, `POST /communities`, `POST/DELETE /communities/{id}/members/me` |
| Discussions | `GET/POST /posts`, `GET/PATCH/DELETE /posts/{id}`, `GET/POST /posts/{id}/comments`, `PUT/DELETE /posts/{id}/like` |
| Projets | `GET/POST /projects`, `GET /projects/{slug}`, `POST/DELETE /projects/{id}/contributors/me` |
| Événements | `GET/POST /events`, `GET /events/{id}`, `PUT/DELETE /events/{id}/rsvps/me` |

### Messages et notifications

Les routes suivantes demandent toutes une session Supabase :

- `GET/POST /conversations` et `GET /conversations/{id}`.
- `GET/POST /conversations/{id}/messages` et `POST /conversations/{id}/read`.
- `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all`.
- `GET /communications/counts` : nombres de messages et de notifications non lus.

Les conversations privées sont réservées à deux participants authentifiés. L’envoi texte utilise un `client_id` UUID pour rendre les nouvelles tentatives idempotentes. Les messages sont paginés par séquence, et les notifications par le couple date/UUID. Les mutations atomiques passent par des fonctions SQL limitées à l’identité Supabase du demandeur. Les communautés privées restent à définir dans une prochaine étape.

### Publications enregistrées

- `PUT /posts/{id}/save` et `DELETE /posts/{id}/save` : enregistrer ou retirer, réponse 204 idempotente.
- `GET /me/saved-posts?limit=20` : publications complètes classées par date d’enregistrement décroissante. Pour la suite, fournir ensemble `before=<saved_at>` et `before_id=<post_id>` du dernier élément.
- `GET /me/state` inclut `saved: [{post_id}]`, sans troncature à la limite de lignes PostgREST.

La migration `202610190001_saved_posts.sql` réserve les sauvegardes au détenteur de la session avec RLS et RPC invoker. La date vient du serveur, reste inchangée lors d’un nouvel appel PUT, et n’est pas modifiable par le client. L’auteur de la publication n’est pas averti et ne peut pas consulter les enregistrements d’un autre compte.

### Administration des communautés et événements

Les migrations `202610190002_community_administration.sql` et `202610190003_admin_validation.sql` ajoutent les couvertures, ressources, charte, permissions déléguées et événements à capacité limitée.

| Action | Route | Autorisation |
| --- | --- | --- |
| Lire ses droits | `GET /communities/{id}/permissions` | Compte connecté |
| Modifier les paramètres | `PATCH /communities/{id}` | Propriétaire ou `edit_community` |
| Supprimer une communauté vide | `DELETE /communities/{id}` | Propriétaire uniquement |
| Promouvoir un membre et attribuer ses droits | `PATCH /communities/{id}/members/{user_id}` | Propriétaire uniquement |
| Retirer un membre | `DELETE /communities/{id}/members/{user_id}` | Propriétaire ; `manage_members` limité aux membres simples |
| Préférence de notifications | `PATCH /communities/{id}/notifications` | Sa propre adhésion |
| Créer, modifier, supprimer un événement | `POST /events`, `PATCH/DELETE /events/{id}` | Propriétaire ou `manage_events` pour la communauté |
| Retirer une publication ou une réponse | `DELETE /posts/{id}`, `DELETE /posts/{id}/comments/{comment_id}` | Auteur ou `moderate_posts` dans la communauté |

`GET /communities/{id}/members` accepte `q`, `role=staff|owner|moderator|member`, `limit` et `offset`. `GET /events` accepte `community_id`, `starts_after` inclusif, `starts_before` exclusif, `include_past`, `limit` et `offset`. Sans période ni `include_past`, seuls les événements non terminés sont renvoyés. Le changement de communauté ou d’organisateur d’un événement existant est interdit.

Le propriétaire ne peut pas être retiré et conserve tous les droits. Les modérateurs ne peuvent pas déléguer leurs propres permissions ni retirer un autre modérateur. Les mutations de rôles, d’événements et d’inscriptions passent par des RPC à identité contrôlée ; les écritures directes correspondantes sont révoquées. L’inscription demande d’être membre pour un événement communautaire. Le verrou de l’événement rend atomique le contrôle de capacité, avec refus d’une réduction sous le nombre d’inscrits. Une nouvelle tentative d’inscription est idempotente.

Les notifications `event_created`, `event_updated` et `event_cancelled` sont générées par la base, avec exclusion de l’acteur. Les membres peuvent désactiver les annonces de leur communauté ; les inscrits restent informés des changements et annulations d’un rendez-vous. Le calendrier charge les événements par mois et les totaux d’inscription sont publics, sans exposer les identités des inscrits.

Le bucket public `community-covers` limite les images à 5 Mo et réserve les écritures au dossier UUID d’une communauté pour laquelle le demandeur possède `edit_community`. Les anciennes images non référencées restent conservées. La suppression d’une communauté contenant des publications ou événements renvoie 409 : aucun contenu n’est supprimé implicitement.

### Comptes entreprise

La migration `202610190005_company_accounts.sql` ajoute `profiles.account_type`
(`individual` par défaut ou `company`) et `company_name`. Les profils existants
restent inchangés. Le champ `company` garde son sens d’employeur pour un particulier.

`PATCH /profiles/me`, `PUT /profiles/me/onboarding` et les brouillons acceptent
ces champs. Une entreprise doit fournir un `company_name` de 1 à 100 caractères
non blancs ; son `full_name` est calculé depuis ce nom. Prénom, nom et expérience
personnelle ne sont pas requis et sont normalisés vides en base pour l’entreprise.
Le parcours conserve ses exigences de nom d’utilisateur, activité, technologies
et intérêts. Les métadonnées Supabase d’inscription utilisent les mêmes champs.

Les colonnes sont publiques comme le nom de profil. Les permissions, RLS et
l’identité transmise par bearer restent identiques pour les deux types de compte.
Le type entreprise ne confère aucun privilège ni statut vérifié.

### Ressources des publications

`POST /posts` et `PATCH /posts/{id}` acceptent `resources` (six éléments maximum) :

- Fichier : `{kind: "image" | "document", path, name, mime_type, size}`. Le chemin
  est `<author_uuid>/<file_uuid>.<extension>` dans le bucket public `post-resources`.
- Lien : `{kind: "link", url, title}` ; URL HTTP(S) limitée à 2048 caractères et
  titre de 1 à 180 caractères.

La migration `202610190006_post_resources.sql` autorise quatre images JPG/PNG/WebP
de 5 Mo maximum et deux documents PDF/TXT/Markdown de 10 Mo maximum, dans la limite
globale de six ressources. Le fichier doit déjà exister dans Storage et appartenir
à l’auteur, avec taille et MIME identiques aux métadonnées envoyées. Les doublons
de chemin et les extensions incohérentes sont refusés. La vue des publications et
la pagination des enregistrements restituent aussi les ressources.

Le téléversement utilise le JWT du compte et `upsert: false`. Le bucket permet
l’insertion dans son propre dossier et la lecture publique, sans remplacement ni
suppression utilisateur. Les fichiers non référencés sont conservés ; une purge
opérateur reste à définir. Aucun contenu distant n’est récupéré pour les liens.

### Canaux des communautés

La migration `202610190007_community_channels.sql` crée `community_channels` et
`posts.channel_id`. Chaque communauté reçoit un canal Général par défaut. Les
publications existantes des communautés actives lui sont rattachées ; les
historiques des communautés archivées restent conservés sans modification.

| Route | Usage |
| --- | --- |
| `GET /communities/{id}/channels?include_archived=false` | Canaux publics du parent actif, archives facultatives |
| `POST /communities/{id}/channels` | Créer : `name`, `description`, `position`, `is_read_only` |
| `PATCH /communities/{id}/channels/{channel_id}` | Modifier ces champs ou définir `archived` |
| `DELETE /communities/{id}/channels/{channel_id}` | Supprimer un canal vide non défini par défaut |

Les mutations exigent `edit_community` et passent par des RPC à identité contrôlée.
Noms uniques par communauté (casse/espaces extérieurs normalisés), cinquante canaux
actifs maximum, nom de 1 à 50 caractères, description jusqu’à 240 et position de
0 à 1000. Le canal par défaut ne peut être archivé ni supprimé.

`POST /posts` et `PATCH /posts/{id}` acceptent `channel_id`. Une destination
communautaire sans canal explicite utilise Général ; un canal d’une autre
communauté est refusé. La communauté d’une publication existante est immuable.
`GET /posts` accepte `channel_id` accompagné de `community_id`, `post_type` et `q`
(80 caractères), avec filtrage avant pagination. `post_directory` expose aussi
`channel_name`, `channel_is_read_only` et `channel_archived_at`.

Les archives interdisent les nouvelles publications et réponses. Les canaux en
lecture seule réservent les écritures à `edit_community` ou `moderate_posts`. Les
corrections d’archives demandent ces mêmes droits, sans élargir les politiques
auteur existantes. Les gardes SQL couvrent publications et commentaires ; les
écritures directes sur les canaux sont révoquées et RLS reste activé.

### Score de contribution et reconnaissance de l’entraide

La migration `202610200001_contribution_scores.sql` calcule le score depuis les
contributions publiques actuelles. Le client ne peut ni envoyer ni modifier un solde.
Les comptes particuliers et entreprises suivent les mêmes règles.

| Contribution | Points | Limite par jour UTC |
| --- | --- | --- |
| Publication | +2 | 3 publications |
| Première réponse à une publication d’un autre auteur | +2 | 5 publications distinctes |
| Ressource accompagnée d’un fichier, lien ou code | +3 supplémentaires | 2 ressources |
| Remerciement reçu sur une réponse d’entraide | +5 | 10 remerciements comptabilisés |
| Réponse choisie comme solution par l’auteur de la question | +15 | 3 solutions |

Un donateur ne peut générer des points qu’une fois par destinataire et par jour,
et une fois par question pour ce destinataire. Un changement de tag ne multiplie
pas les points. Les likes, abonnements et connexions ne donnent pas de points.
Les contenus supprimés ou archivés cessent de contribuer au score. Les compteurs
de remerciements et de solutions restent distincts des points plafonnés.

| Route | Contrat |
| --- | --- |
| `GET /people/{user_id}/score` | Score public et détail `posts_points`, `answers_points`, `resources_points`, `thanks_points`, `solutions_points`, `thanks_received`, `solutions_count` |
| `PUT /posts/{post_id}/comments/{comment_id}/thanks` | `{tag: "thanks" \| "helpful" \| "clear"}` ; un choix par compte et réponse |
| `DELETE /posts/{post_id}/comments/{comment_id}/thanks` | Retirer son choix, opération idempotente |
| `PUT /posts/{post_id}/solution` | `{comment_id: UUID \| null}` ; sélectionner, remplacer ou retirer la solution |

Les mutations demandent une session Supabase. Les remerciements sont réservés aux
questions ; l’auteur ne peut remercier sa propre réponse. Seul l’auteur de la
question choisit la solution, parmi les réponses d’un autre compte à cette même
question. Dans une communauté, l’adhésion et les règles des canaux s’appliquent.
Les opérations sont atomiques via des RPC, avec identité `auth.uid()` et verrous.
Les tables privées ne sont pas directement accessibles via la Data API ; seuls
les totaux et le choix du demandeur sont exposés, jamais la liste des votants.

Les profils, `/me/state`, personnes et membres incluent `contribution_score` ; les
publications, enregistrements et réponses incluent `author_score`. Ces valeurs sont
enrichies par lots de cent identités au maximum, sans requête par auteur. Les
réponses incluent `thanks_count`, `my_thanks_tag`, `is_solution` et la publication
expose `accepted_comment_id`. Les erreurs de calcul sont propagées, sans remplacer
silencieusement un échec RPC par un score nul. Le repository HTTPX conserve le
bearer du demandeur pour chaque appel.
