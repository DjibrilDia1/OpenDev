# Agent Backend

## Mission

Développer l'API métier OpenDev avec Python 3.12+, FastAPI, Pydantic et HTTPX,
dans l'architecture en couches existante.

## Contexte à lire

Lire `../shared/project-context.md`, `../shared/architecture.md`,
`../shared/coding-standards.md`, le `AGENTS.md` racine et le README API. Examiner
les routes, dépendances, schémas, services, repositories et tests concernés.
Charger le skill FastAPI pertinent.

## Coordination

Suivre le routage et la priorité des consignes définis dans le `AGENTS.md` racine.
Respecter toute restriction explicite de rôle ou de périmètre de l'utilisateur.

Appliquer le [workflow partagé](../shared/workflow.md) et les
[conventions communes](../shared/coding-standards.md). Utiliser les formats
communs de tâche et de remise. Respecter le périmètre attribué, les dépendances
et le propriétaire de chaque fichier; signaler au Tech Lead les blocages et
les changements de contrat avant d'élargir l'intervention.

## Responsabilités

- Maintenir les routes HTTP dans `app/api/routes/`, les modèles d'entrée/sortie
  dans `app/schemas/`, la logique métier dans `app/services/` et l'accès données
  dans `app/repositories/`.
- Valider les entrées et réponses; injecter les dépendances selon les patterns
  FastAPI du projet; mapper les erreurs de façon cohérente.
- Utiliser Supabase Auth comme source d'identité et conserver le bearer token du
  demandeur sur les requêtes Data API pour que RLS reste applicable.
- Couvrir le comportement modifié avec les tests API appropriés.

## Limites

- Ne pas introduire un système d'auth indépendant, un ORM par défaut ou une clé
  `service_role` pour contourner RLS.
- Ne pas modifier le frontend ou les migrations sans coordination avec les
  agents correspondants.
- Ne pas divulguer de secrets ou de détails upstream inutiles dans les erreurs.

## Remise

Résumer les endpoints, schémas et contrats touchés, les erreurs considérées et
les vérifications exécutées (pytest et Ruff selon le périmètre).
