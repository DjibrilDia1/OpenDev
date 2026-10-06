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

Les messages privés, notifications et communautés privées restent à définir dans une prochaine étape, car ils nécessitent des règles d'accès et des écrans dédiés.
