# Architecture technique observée

## Vue d'ensemble

```text
Navigateur
  └─ React 19 / Vite / React Router
       ├─ aujourd'hui : DemoProvider → état localStorage et données fictives
       ├─ client Supabase prévu : Auth et accès autorisés par RLS
       └─ proxy /api → FastAPI /api/v1
                            ├─ routes HTTP
                            ├─ dépendances : validation du jeton Supabase Auth
                            ├─ schémas Pydantic
                            ├─ services métier
                            └─ repositories HTTPX → Supabase Data API/PostgREST
                                                     └─ PostgreSQL + RLS
```

Les parcours web visibles sont actuellement une démonstration autonome. Le
backend et le schéma de données constituent la base prévue pour une intégration
ultérieure; le client Supabase n'est pas encore branché sur ces parcours.

## Frontend

`OpenDev-web/src/App.tsx` définit les routes avec React Router. `pages/` compose
les écrans; `components/` regroupe les éléments communs, le layout, le feed,
l'authentification simulée et les profils. `state/DemoProvider.tsx` et
`state/store.ts` gèrent l'état et ses actions; `mocks/opendev-data.ts` et
`state/catalog.ts` fournissent les données de démonstration. Le thème est défini
en partie dans `src/index.css` et `tailwind.config.js`.

Le stockage local est versionné (`opendev:demo:v1`) et inclut des données fictives
de profils, messages, événements et publications. Ne pas interpréter l'écran de
connexion simulé comme une authentification réelle.

## API et données

`OpenDev-api/app/main.py` configure FastAPI, CORS, le cycle de vie HTTPX, la
traduction des erreurs du dépôt et l'enregistrement des routeurs. Les routes se
trouvent dans `app/api/routes/`; les dépendances communes valident le bearer token
contre Supabase Auth et construisent le client de données. Les schémas résident
dans `app/schemas/`, la logique métier dans `app/services/` et l'accès aux tables
dans `app/repositories/supabase_rest.py`.

Le repository HTTP transmet la clé publique Supabase (`apikey`) et, si le
demandeur en a fourni un, son bearer token. Ce token préserve l'identité RLS.
Ne pas remplacer ce modèle par une clé `service_role` ou un accès privilégié
pour les opérations utilisateur ordinaires.

Les migrations Supabase sont la source versionnée du schéma. Elles créent des
tables, contraintes, index, fonctions et triggers, vues qui utilisent
`security_invoker`, et politiques RLS. La migration distante est déclenchée
manuellement par le workflow dédié; une exécution de tests locaux ne déploie pas
de schéma distant.

## Infrastructure et livraison

`compose.yml` démarre l'API et le serveur Vite; le frontend attend un healthcheck
API. `compose.prod.yml` sert le build web par Nginx, qui relaie `/api/` à FastAPI.
Les deux images définissent des cibles développement et production et exécutent
les processus sous un utilisateur non privilégié.

Les workflows `.github/workflows/api-ci.yml` et `web-ci.yml` sont filtrés par
chemins. La CI API lance Ruff, pytest, build Python, contrôles de conteneurs et
validation locale des migrations. La CI Web lance ESLint, TypeScript/Vite build
et contrôles de conteneurs. `deploy-database.yml` est manuel et limité à la
branche `main`. Le déploiement web/API vers un hébergeur n'est pas configuré.

## Vérifications disponibles

- API : `uv run --locked --extra dev ruff check app tests`,
  `uv run --locked --extra dev ruff format --check app tests`,
  `uv run --locked --extra dev python -m pytest -q` depuis `OpenDev-api`.
- Web : `npm run lint` et `npm run build` depuis `OpenDev-web`.
- Docker : les pipelines construisent et démarrent les images. Les tests
  navigateur cités dans le README web sont des vérifications ponctuelles; aucun
  workflow E2E dédié n'est listé dans `.github/workflows`.

Cette description reflète le dépôt observé et doit être révisée quand la
persistance web, l'authentification ou l'infrastructure évoluent.
