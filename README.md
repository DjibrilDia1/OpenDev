# OpenDev

Les pipelines GitHub Actions sont définies dans [.github/workflows](.github/workflows) : une CI API, une CI Web et un workflow manuel pour les migrations Supabase.

OpenDev est une communauté de développeurs pour discuter, apprendre, partager, découvrir et construire ensemble.

## Architecture

- `OpenDev-web` : interface React, TypeScript et Tailwind CSS.
- `OpenDev-api` : API métier FastAPI.
- Supabase : authentification, PostgreSQL et politiques d'accès (RLS).

Le client Supabase du navigateur gère les sessions et les opérations autorisées par RLS. FastAPI porte la logique métier et vérifie les jetons Supabase pour ses routes protégées. Ne jamais exposer la clé `service_role` dans le frontend.

## Validation des modifications

[.github/CODEOWNERS](.github/CODEOWNERS) désigne `@DjibrilDia1` comme responsable du backend, des workflows et de la configuration partagée. Ajouter les autres développeurs backend ayant accès en écriture sur la même ligne que `/OpenDev-api/`. Une approbation de l'un des responsables suffit. Prévoir un autre responsable pour approuver les PR de l'auteur, qui ne peut pas approuver ses propres changements.

Pour rendre cette validation obligatoire, le fichier doit être présent sur `main`. Dans GitHub → Settings → Branches, créer une règle de protection de `main` et activer :

- Require a pull request before merging.
- Require approvals : au moins une approbation.
- Require review from Code Owners.
- Dismiss stale pull request approvals when new commits are pushed.
- Do not allow bypassing the above settings.

Une PR qui modifie uniquement le frontend demande une approbation ordinaire; une PR qui touche au backend ou aux fichiers partagés désignés exige l'approbation de leur responsable. Le fichier CODEOWNERS seul ne bloque pas les fusions ni les push sur les branches de travail. La disponibilité des protections dépend du forfait GitHub et de la visibilité du dépôt.

Les CI utilisent des filtres de chemins. Ne pas rendre les deux CI systématiquement obligatoires pour toutes les PR sans adapter ces filtres, car un workflow du dossier inchangé peut ne pas démarrer.

## Prérequis

Pour les environnements Docker : Docker Desktop démarré en mode conteneurs Linux et Docker Compose v2.

## Docker : développement

Depuis la racine du dépôt, avec `OpenDev-api/.env` et `OpenDev-web/.env` configurés :

```powershell
docker compose up -d --build --wait
```

React est disponible sur http://localhost:5173 et FastAPI sur http://localhost:8000/docs. Le code source est monté pour le rechargement automatique; les dépendances Linux restent dans les images. Supabase reste le projet hébergé; Compose ne déploie pas de migration distante.

```powershell
docker compose logs -f
docker compose exec api python -m pytest -q
docker compose exec web npm run lint
docker compose down
```

Si un port est occupé, le modifier sans arrêter l'autre application :

```powershell
$env:OPENDEV_WEB_PORT = '5174'
$env:OPENDEV_API_PORT = '8001'
docker compose up -d --wait
```

Seuls les ports de la machine hôte changent. Les conteneurs continuent d'utiliser 5173 et 8000. Pour rendre ce choix permanent, ces variables peuvent être placées dans un fichier `.env` à la racine, exclu de Git; `.env.example` fournit leurs valeurs par défaut.

## Docker : images de production

Cette configuration est autonome :

```powershell
docker compose --env-file OpenDev-web/.env -f compose.prod.yml up -d --build --wait
```

L'application est disponible sur http://localhost:8080 (`OPENDEV_PROD_WEB_PORT` permet de changer ce port). React est compilé et servi par Nginx, qui transmet `/api/…` à FastAPI. L'API reste accessible sur le réseau Docker. Les routes React utilisent un fallback vers `index.html`.

```powershell
docker compose --env-file OpenDev-web/.env -f compose.prod.yml down
```

La configuration publique Supabase de React est incorporée au build via `--env-file`; sa modification nécessite une reconstruction. Les variables FastAPI sont chargées au démarrage depuis `OpenDev-api/.env`. Aucun fichier `.env` n'est copié dans les images. Ne jamais utiliser une clé secrète dans les variables `VITE_…`.

Les images de base sont figées par digest, les dépendances Python par `OpenDev-api/uv.lock`, et celles du frontend par `OpenDev-web/package-lock.json`. Les conteneurs utilisent des utilisateurs non privilégiés et des healthchecks; le frontend attend une API saine. Le healthcheck API vérifie FastAPI, pas la disponibilité de Supabase.

Après une modification de dépendances Python, mettre à jour le verrouillage avec uv 0.12.23 : `uv lock`. Pour installer les versions verrouillées hors Docker : `uv sync --locked --extra dev`. Pour le frontend : `npm ci`. Reconstruire les images après une modification des dépendances ou d'un fichier de configuration non monté.

## CI des conteneurs

Les deux pipelines construisent les images de développement et de production, exécutent les tests Python ou ESLint dans les conteneurs, puis vérifient le démarrage des images de production. Les changements dans `compose*.yml` déclenchent les deux CI.

Le déploiement Systalink sera configuré plus tard avec les domaines, HTTPS et les services retenus. Aucune image n'est publiée sur un registre pour l'instant.

## Prérequis hors Docker

Node.js 20.19+ ou 22.12+, npm et Python 3.12+.

## Frontend

```powershell
cd OpenDev-web
npm install
Copy-Item .env.example .env.local
npm run dev
```

Configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` et éventuellement `VITE_API_URL` dans `.env.local`.

## API

```powershell
cd OpenDev-api
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

Documentation interactive : `http://127.0.0.1:8000/docs`.
