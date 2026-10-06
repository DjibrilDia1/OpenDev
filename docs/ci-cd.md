# Pipeline OpenDev

## Vérification continue

Deux workflows indépendants démarrent sur les push, les pull requests et à la demande. Ils ne requièrent aucun secret Supabase.

| Dossier | Workflow | Déclenchement automatique |
| --- | --- | --- |
| `OpenDev-api` | `.github/workflows/api-ci.yml` — `OpenDev API - CI` | Changements dans `OpenDev-api/**`, son workflow ou le workflow des migrations distantes |
| `OpenDev-web` | `.github/workflows/web-ci.yml` — `OpenDev Web - CI` | Changements dans `OpenDev-web/**` ou son workflow |

GitHub recherche les workflows dans `.github/workflows` à la racine du dépôt. Chaque workflow définit le dossier de travail de ses commandes et le chemin de ses artifacts. Une modification des deux applications lance les deux pipelines; une modification du frontend seul lance uniquement sa pipeline.

- Backend Python 3.12 : installation, Ruff, tests HTTP et transmission du jeton utilisateur, construction du package Python.
- Frontend Node 24 : installation reproductible avec `npm ci`, ESLint, TypeScript et build Vite.
- Base temporaire Supabase sur le runner : démarrage local et application de toutes les migrations depuis une base vide. Aucun accès au projet distant.

Les packages Python et les fichiers React sont disponibles pendant 14 jours dans les artifacts de chaque exécution. Le déploiement des applications sur Systalink sera ajouté lorsque les services et leur méthode de livraison seront définis.

## Configuration frontend

Dans GitHub → Settings → Secrets and variables → Actions → Variables, renseigner :

| Variable | Valeur |
| --- | --- |
| `SUPABASE_URL` | `https://gkpbainuzdmpdvtzefxm.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Clé publique `sb_publishable_…` du projet |
| `VITE_API_URL` | URL publique de FastAPI, terminant par `/api/v1`, quand le service sera déployé |

Ces valeurs sont incorporées au build React et restent publiques. Une compilation sans ces variables sert à vérifier le code; son artifact ne constitue pas une application configurée pour la production. Ne jamais placer de clé secrète dans une variable `VITE_…`.

## Déploiement des migrations

Le workflow `Deploy Supabase migrations` est uniquement manuel. Aucun push ne déploie automatiquement une migration. Il relance la CI API, comprenant les tests backend et les migrations sur une base temporaire, et autorise la migration distante uniquement depuis la branche `main`.

Avant la première exécution :

1. Créer l'environnement GitHub `production` dans Settings → Environments.
2. Dans cet environnement, ajouter la variable `SUPABASE_PROJECT_REF` avec la valeur `gkpbainuzdmpdvtzefxm`.
3. Ajouter les secrets `SUPABASE_ACCESS_TOKEN` (jeton personnel Supabase, distinct de la clé publique) et `SUPABASE_DB_PASSWORD` (mot de passe de la base du projet).
4. Restreindre les branches de déploiement de l'environnement à `main`. Configurer les protections de branche et, si souhaité, les reviewers de l'environnement selon les options disponibles sur le dépôt.
5. Depuis Actions → Deploy Supabase migrations → Run workflow, sélectionner `main`.

Le job vérifie la présence des identifiants, lie le projet, affiche un aperçu des migrations en attente, puis applique ces migrations. Les déploiements sont sérialisés et un déploiement en cours n'est pas annulé par le suivant. Le dry run ne valide pas l'exécution SQL; c'est la CI sur la base temporaire qui vérifie les migrations.

Les fichiers `.env` restent locaux et exclus de Git. Les secrets ne doivent pas être ajoutés au code ni partagés dans les logs.

## État de validation initiale

Les contrôles Ruff, les six tests backend, ESLint et le build React ont été exécutés localement. Docker Desktop n'était pas démarré; l'application des migrations locales doit encore être vérifiée par le job database sur GitHub.

L'audit npm signale sept vulnérabilités dans les dépendances de développement de Tailwind 3. Les mises à jour compatibles ne les corrigent pas; npm propose une migration majeure vers Tailwind 4. Cette migration doit être traitée séparément avant la livraison en production.

## Vérifications locales

Depuis `OpenDev-api`, avec l'environnement virtuel activé :

```powershell
ruff check app tests
ruff format --check app tests
python -m pytest -q
```

Depuis `OpenDev-web` :

```powershell
npm ci
npm run lint
npm run build
```

Avec Docker et la CLI Supabase disponibles, depuis `OpenDev-api` :

```powershell
npx supabase start
npx supabase db reset --local --no-seed
npx supabase stop --no-backup
```

Les workflows doivent être poussés sur GitHub pour apparaître dans l'onglet Actions. Les filtres de chemins ne démarrent pas les contrôles du dossier inchangé : ne pas rendre ces contrôles systématiquement obligatoires dans une règle de branche commune, car GitHub peut alors attendre un workflow qui ne se lancera pas. Si des contrôles obligatoires sont configurés, adapter les règles au monorepo ou retirer les filtres de chemins.
