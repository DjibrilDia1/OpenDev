# Contexte du projet OpenDev

## Objectif

OpenDev est une communauté de développeurs pour discuter, apprendre, partager,
découvrir des communautés et construire des projets ensemble. Le dépôt contient
une application web, une API métier et les migrations Supabase.

## Stack observée

- **Web :** React 19, TypeScript 5.9, Vite 7, React Router 7 et Tailwind CSS 3.
  ESLint assure le linting; `npm run build` lance TypeScript puis Vite. Les
  versions sont verrouillées par `OpenDev-web/package-lock.json`.
- **API :** Python 3.12+, FastAPI, Pydantic Settings et HTTPX. Ruff est configuré
  pour le lint et le format; pytest est le framework de tests. `uv.lock` fixe les
  dépendances.
- **Données et identité :** Supabase Auth, PostgreSQL, Supabase Data API et RLS.
  Les changements de schéma sont des migrations versionnées dans
  `OpenDev-api/supabase/migrations`.
- **Infrastructure :** Docker Compose pour le développement et la production;
  images multi-étapes pour le web (Nginx) et l'API. GitHub Actions fournit les
  CI web et API et un workflow manuel de migrations.

## Structure

```text
OpenDev-web/                 Application React/Vite
  src/components/            Composants communs, layout, feed, auth, profils
  src/pages/                  Écrans et routes
  src/state/                  État et fournisseur de démonstration
  src/mocks/                  Données fictives
  src/lib/supabase.ts         Client Supabase préparé
OpenDev-api/                 API FastAPI
  app/api/routes/             Endpoints HTTP
  app/schemas/                Schémas Pydantic
  app/services/               Logique métier
  app/repositories/           Adaptateur Supabase Data API
  supabase/migrations/        Schéma, fonctions, vues et politiques RLS
  tests/                      Tests API et transfert du jeton RLS
.github/workflows/           CI web/API et migration manuelle
compose.yml                   Services de développement
compose.prod.yml              Services de production locaux
.agents/                      Skills installés et documentation des agents
```

## Fonctionnement actuel

- Le frontend présente des parcours de démonstration. L'état partagé est géré
  par `DemoProvider` et conservé dans `localStorage` sous
  `opendev:demo:v1`; la connexion est simulée.
- Le client Supabase du navigateur est configuré mais n'est pas utilisé par ces
  parcours. Les variables d'environnement et le proxy API sont préparés pour
  l'intégration.
- L'API expose des routes versionnées sous `/api/v1` pour les profils,
  communautés, publications, projets, événements et découverte. Elle valide les
  jetons auprès de Supabase Auth; le dépôt HTTP transmet le jeton utilisateur à
  PostgREST afin que les politiques RLS s'appliquent.
- La migration initiale définit profils, communautés, membres, publications,
  commentaires, réactions, projets, contributeurs et événements. Elle crée des
  fonctions, déclencheurs, vues avec `security_invoker` et politiques RLS.
- Les messages privés et notifications réels restent à définir. Le README web
  décrit certaines vues de démonstration qui n'ont pas encore de persistance
  serveur.

## Configuration et secrets

Des modèles non secrets figurent dans `OpenDev-web/.env.example` et
`OpenDev-api/.env.example`. Ne jamais lire, recopier ou journaliser les fichiers
`.env` réels. Les valeurs `VITE_*` sont publiques car intégrées au bundle; ne
jamais y placer de secret ni de clé `service_role`. Supabase Auth et RLS restent
les autorités d'identité et d'accès aux données; conserver le jeton du demandeur
sur les requêtes de données.

## Déploiement et validation existants

- `compose.yml` monte le code en lecture seule dans les conteneurs de
  développement; `compose.prod.yml` sert le bundle web via Nginx et rend l'API
  disponible sur le réseau Docker.
- Les workflows API et Web exécutent leurs contrôles, construisent les images et
  font un smoke test des conteneurs. La CI API valide aussi les migrations sur
  une instance Supabase locale temporaire.
- `deploy-database.yml` est manuel, limité à `main`, et utilise un environnement
  `production`. Aucun déploiement applicatif vers Systalink n'est configuré à la
  date d'observation.
- Voir les README racine, web et API pour les commandes et prérequis actuels.

## Points d'attention observés

Ce sont des limites de portée documentées dans le dépôt, pas des défauts
confirmés : l'interface est encore une démo locale et n'est pas intégrée à
l'API; messages privés et notifications réels restent à définir; aucune CI E2E
navigateur n'est listée; le déploiement applicatif n'est pas configuré. Lors
d'une intégration, convenir des contrats API, des règles d'accès et des tests
avant de remplacer les parcours simulés.

## Conventions à préserver

Consulter le `AGENTS.md` racine, les README concernés et les skills ciblés avant
une modification. Garder le design monochrome existant et les choix UI établis.
Respecter les couches routes/schémas/services/repositories de l'API. Les
migrations sont versionnées; ne pas modifier les données distantes directement.
Conserver les changements déjà présents dans le working tree et limiter chaque
intervention au périmètre confié.
