# Conventions de développement

## Règles de dépôt

- Lire `AGENTS.md`, le README du sous-projet et les conventions voisines avant
  d'éditer. Inspecter `git status` et le diff; garder intacts les changements
  préexistants qui ne relèvent pas de la tâche.
- Adapter les exemples et recommandations à la stack installée et aux versions
  verrouillées. Ne pas migrer vers un autre framework ni ajouter de dépendance
  sans besoin justifié.
- Réutiliser les composants, services et utilitaires existants. Limiter les
  modifications au domaine attribué et signaler les dépendances entre domaines.
- Ne pas inclure de secrets, de fichiers `.env` réels ou de données personnelles
  dans le code, les logs, les commits ou les exemples.

## Frontend

- Utiliser React 19, TypeScript strict du projet, Vite et les composants
  fonctionnels existants. Préserver le design monochrome, les tokens,
  conventions CSS et la navigation responsive.
- Utiliser les composants communs de `src/components/common/` avant d'en créer
  de nouveaux. Garder les pages dans `src/pages/`, le layout dans
  `src/components/layout/` et l'état partagé dans `src/state/` selon le besoin.
- Respecter ESLint, les règles des hooks React, le HTML sémantique, les libellés
  accessibles, la navigation clavier et les états de chargement/erreur/absence.
- Ne pas supposer que le client Supabase est déjà utilisé dans l'interface :
  vérifier l'intégration concrète avant d'ajouter des appels.

## Backend Python

- Utiliser Python 3.12+, FastAPI et les schémas Pydantic du projet. Maintenir les
  responsabilités routes, schemas, services et repositories.
- Respecter Ruff : ligne de 100 caractères, cible `py312`, règles `E`, `F`, `I`,
  `UP`, `B`. Conserver les types et les dépendances injectées déjà utilisées.
- Propager les erreurs selon le traitement commun dans `app/main.py`; éviter de
  divulguer des réponses ou secrets upstream non nécessaires.
- Garder l'identité du demandeur sur Supabase Data API afin que RLS s'applique.
  Ne pas ajouter un ORM, un système d'auth indépendant ou une clé
  `service_role` sans décision d'architecture explicite.

## Base de données et accès

- Toute évolution de schéma appartient à une nouvelle migration SQL datée dans
  `OpenDev-api/supabase/migrations/`; ne pas réécrire une migration déjà
  appliquée.
- Définir et vérifier contraintes, index, fonctions, permissions et politiques
  RLS ensemble. Utiliser des tests ou la CI locale pour valider les migrations.
- Ne pas exécuter de modification directe sur une base distante. Ne pas supprimer
  de données, tables ou politiques de production sans validation explicite.

## Tests, CI et documentation

- Choisir les vérifications existantes du périmètre : pytest/Ruff pour l'API,
  ESLint/build pour le web, validation Supabase locale pour les migrations.
  Ajouter des tests avec un changement fonctionnel quand c'est pertinent.
- Ne pas affirmer qu'un contrôle a réussi sans l'avoir exécuté. Signaler les
  contrôles impossibles et leurs raisons.
- Garder les verrous (`uv.lock`, `package-lock.json`) cohérents si une dépendance
  change. Mettre à jour la documentation qui devient inexacte.
- Les images Docker, workflows et fichiers Compose sont des surfaces DevOps
  partagées; coordonner toute modification traversant plusieurs composants.
