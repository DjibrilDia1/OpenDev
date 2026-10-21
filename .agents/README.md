# Skills de développement OpenDev

18 skills sont installés localement dans `.agents/skills`, pour les assistants travaillant dans ce dépôt. Ils peuvent être partagés avec l'équipe via Git. Ils sont découverts lors d'un prochain tour ou d'une nouvelle session ouverte sur OpenDev.

| Domaine | Skills | Source |
| --- | --- | --- |
| React | `vercel-react-best-practices`, `vercel-composition-patterns` | [Vercel](https://github.com/vercel-labs/agent-skills) |
| TypeScript | `typescript-advanced-types` | [wshobson/agents](https://github.com/wshobson/agents) |
| Design et accessibilité | `frontend-design`, `web-design-guidelines` | [Anthropic](https://github.com/anthropics/skills), Vercel |
| Backend | `fastapi` | [FastAPI](https://github.com/fastapi/fastapi/tree/master/fastapi/.agents/skills/fastapi) |
| Données et RLS | `supabase-postgres-best-practices` | [Supabase](https://github.com/supabase/agent-skills) |
| Docker | `docker-build-strategies`, `docker-compose-patterns` | [Docker](https://github.com/docker/skills) |
| Tests | `python-testing-patterns`, `playwright`, `webapp-testing` | wshobson/agents, [OpenAI](https://github.com/openai/skills), Anthropic |
| Revue de code et CI | `code-review-excellence`, `gh-address-comments`, `gh-fix-ci` | wshobson/agents, OpenAI |
| Sécurité | `security-best-practices`, `security-threat-model`, `security-ownership-map` | OpenAI |

Les dossiers `react-best-practices` et `composition-patterns` conservent les noms de leurs répertoires sources; leurs noms déclarés de skills commencent par `vercel-`.

## Utilisation

Les consignes de sélection et les conventions du projet sont dans [AGENTS.md](../AGENTS.md). Lire les skills utiles à la tâche, sans charger tous leurs guides simultanément. Les skills Figma sont déjà fournis par le plugin installé et ne sont pas dupliqués ici.

Les exemples génériques doivent être adaptés à React/Vite, FastAPI et Supabase Auth/RLS. Le skill FastAPI peut présenter des fonctionnalités plus récentes que les dépendances verrouillées : vérifier leur disponibilité avant utilisation.

## Versions et maintenance

`skills-manifest.json` enregistre pour chaque skill le dépôt source, le commit exact, le chemin source et les empreintes SHA-256 des fichiers installés. Les contenus upstream sont conservés tels quels. Les licences disponibles sont fournies avec les skills ou dans `licenses/`.

Pour mettre à jour un skill, examiner la nouvelle version source, réinstaller sa distribution complète et actualiser le manifeste. Le programme d'installation officiel refuse d'écraser un dossier existant : conserver ou sauvegarder l'ancienne version avant remplacement.

## Outils externes

L'installation des skills ne lance pas de scripts tiers et n'installe pas automatiquement leurs outils. GitHub CLI nécessite une connexion autorisée pour les skills `gh-*`; les vérifications navigateur nécessitent les outils Playwright appropriés. Les outils Docker et Python doivent être disponibles pour les tâches qui en dépendent.

## Agents spécialisés

Ce dépôt documente aussi une équipe d'agents dans `tech-lead/`, `frontend/`,
`backend/`, `ui-ux/`, `database/`, `security/`, `qa/` et `devops/`. Leurs rôles
sont décrits dans leurs fichiers `AGENT.md`; le contexte commun se trouve dans
[`shared/`](shared/). Ces documents complètent les skills ci-dessus et ne les
remplacent pas.

Le [AGENTS.md racine](../AGENTS.md) est le point d'entrée de l'orchestration.
L'utilisateur décrit son objectif; les domaines et rôles pertinents sont
sélectionnés automatiquement. Un rôle nommé explicitement limite le périmètre.
Avant une tâche, lire le contexte, l'architecture, les conventions et le workflow
dans `shared/`, puis les guides de rôle et les skills pertinents. Les agents sont des consignes
portables en Markdown, pas des processus exécutables ni des agents créés
automatiquement. L'orchestration et la délégation dépendent de l'outil utilisé.
Voir [le workflow de collaboration](shared/workflow.md) et ses
[recommandations Codex](shared/workflow.md#utilisation-avec-codex).

| Agent | Domaine |
| --- | --- |
| `tech-lead` | Découpage, coordination, contrats et revue finale |
| `frontend` | React, état, intégration API et accessibilité web |
| `backend` | Routes FastAPI, schémas, logique métier et services |
| `ui-ux` | Parcours, navigation, cohérence visuelle et accessibilité |
| `database` | PostgreSQL/Supabase, migrations et RLS |
| `security` | Identité, autorisation, validation, secrets et vulnérabilités |
| `qa` | Scénarios, régressions et contrôles reproductibles |
| `devops` | Docker, Compose, CI/CD et environnements |

Le contexte partagé décrit l'état observé lors de sa rédaction. Le mettre à jour
lorsque l'architecture ou les conventions du dépôt changent.
