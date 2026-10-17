# Collaboration des agents

## Documents de référence

Le `AGENTS.md` racine est le point d'entrée des consignes du dépôt. Ce document
définit le protocole commun d'orchestration; les fichiers
`.agents/<rôle>/AGENT.md` précisent les responsabilités de chaque rôle. Lire
également `project-context.md`, `architecture.md` et `coding-standards.md` avant
une intervention. Les chemins de cette section sont relatifs à ce document,
sauf ceux qui commencent par `.agents/`, relatifs à la racine du dépôt.

## Routage des demandes et priorité des consignes

L'utilisateur décrit son objectif; il n'a pas à choisir les agents. Pour chaque
demande de développement, identifier les domaines concernés, lire uniquement
les guides et skills pertinents et appliquer leurs responsabilités. Le Tech Lead
coordonne les demandes qui couvrent plusieurs domaines. Une demande limitée à
un domaine suit le guide correspondant sans activer de spécialistes inutiles.

Si l'utilisateur sélectionne un rôle ou restreint le périmètre, respecter cette
limite. Si une dépendance rendrait l'implémentation incorrecte ou dangereuse,
l'expliquer avant d'élargir le travail.

Dans les consignes du dépôt, l'ordre de priorité est : instructions explicites
de l'utilisateur, `AGENTS.md` racine, guide `AGENT.md` du spécialiste, skill
pertinent, puis conventions génériques du framework. Les documents partagés
complètent le `AGENTS.md` racine et respectent ses règles.

## Cycle de travail

```text
Demande utilisateur
        ↓
Tech Lead : analyse, domaines concernés et découpage si plusieurs domaines
        ↓
Agents spécialisés : analyse et changements par domaine
        ↓
Intégration : interfaces, migrations et dépendances cohérentes
        ↓
QA : vérifications adaptées aux changements
        ↓
Security : revue requise pour les changements sensibles définis ci-dessous
        ↓
Tech Lead : revue finale et compte rendu
```

Le Tech Lead attribue des tâches explicites et ordonnées, par exemple :

1. UI/UX : préciser les états et interactions à couvrir.
2. Database : proposer la migration et les politiques RLS si le modèle change.
3. Backend : implémenter le contrat API après accord sur le schéma.
4. Frontend : intégrer le contrat API et les composants convenus.
5. QA : vérifier les comportements et les régressions.
6. Security : examiner les changements d'authentification, d'autorisation, de
   RLS, de secrets, de fichiers téléversés, de contenu utilisateur ou d'opérations
   sensibles.
7. Tech Lead : vérifier la cohérence du résultat et les décisions ouvertes.

N'activer que les rôles utiles. Des tâches indépendantes peuvent être menées en
parallèle si elles ont des fichiers et contrats distincts. Pour les tâches
dépendantes, convenir d'abord d'un contrat et d'un propriétaire par fichier pour
éviter les modifications concurrentes.

## Protocole par tâche

1. Lire ce contexte, le `AGENTS.md` racine, les fichiers concernés et les
   instructions du rôle. Lire uniquement les skills nécessaires.
2. Vérifier branche, `git status` et diff avant d'éditer. Les changements
   préexistants appartiennent à l'utilisateur : ne pas les annuler, les écraser
   ou les inclure accidentellement.
3. Le Tech Lead écrit un but, des critères d'acceptation, les fichiers/domaine
   concernés, les dépendances et les vérifications attendues.
4. Chaque agent annonce les fichiers modifiés, les hypothèses, les contrats
   affectés, les vérifications effectuées et les blocages.
5. Si le périmètre change, le Tech Lead réattribue les tâches avant qu'un agent
   élargisse ses modifications.
6. QA vérifie les fonctionnalités transverses après implémentation et exécute
   les contrôles adaptés. Une revue Security est requise pour les changements
   d'authentification, d'autorisation, de RLS, de secrets, de fichiers téléversés,
   de contenu utilisateur ou d'opérations sensibles.
7. Le Tech Lead examine le diff intégré, les migrations, les secrets, la
   cohérence des contrats et l'état Git, puis résume le résultat et les limites.

## Format commun des tâches et des remises

Le Tech Lead utilise ce format pour attribuer chaque tâche :

```text
Tâche : identifiant et objectif
Agent : rôle responsable
Périmètre : fichiers autorisés et contrats concernés
Dépendances : tâches préalables et décisions attendues
Acceptation : comportements ou livrables attendus
Vérifications : commandes ou scénarios pertinents
```

Chaque agent utilise ce format pour transmettre son résultat :

```text
Tâche : identifiant
État : terminée, partielle ou bloquée
Changements : fichiers, comportement et décisions
Contrats : interfaces modifiées et conséquences pour les autres rôles
Vérifications : contrôles exécutés, résultats et contrôles non exécutés
Suite : blocages, risques et interventions nécessaires
```

Un résultat partiel ou bloqué revient au Tech Lead pour réattribution ou
résolution des dépendances. La revue finale vérifie les critères d'acceptation
et les résultats QA; elle rapporte les limites restantes explicitement.

## Règles de coordination

- Les fichiers du dépôt et le diff Git sont la source commune de vérité; ne pas
  dépendre d'un échange privé ou d'un état mémoire propre à un fournisseur.
- Un agent spécialisé ne modifie pas le domaine d'un autre sans délégation ou
  accord explicite du Tech Lead. Il signale les changements transverses requis.
- Le Tech Lead coordonne et révise; il n'implémente pas par défaut toutes les
  tâches spécialisées.
- DevOps ne déploie pas et ne modifie pas l'infrastructure de production sans
  demande explicite. Toute opération destructive importante nécessite une
  confirmation; aucune modification directe des données de production n'est
  autorisée par ce workflow. Les migrations passent par le processus prévu.
- Le compte rendu final distingue les contrôles exécutés de ceux recommandés.

## Utilisation avec Codex

Les fichiers `AGENT.md` par rôle sont des consignes portables en Markdown.
Codex charge automatiquement `AGENTS.md` selon son mécanisme d'instructions; il
ne découvre pas automatiquement ces fichiers de rôle comme des agents séparés.
Le `AGENTS.md` racine demande maintenant de lire le contexte partagé, ce
workflow et les guides de rôle pertinents. L'utilisateur peut décrire simplement
son objectif : les domaines et rôles sont déterminés à partir de la demande.
Nommer un rôle est facultatif et permet de restreindre le périmètre. Le Tech
Lead utilise le format commun pour les tâches impliquant plusieurs domaines.

Dans Codex, le Tech Lead peut déléguer via les sous-agents disponibles seulement
si l'utilisateur ou les instructions applicables autorisent la délégation et si
la tâche s'y prête. Donner à chaque sous-agent un rôle, un périmètre de fichiers,
un contrat et un livrable. Relire les diffs partagés après leur retour. Les
fichiers Markdown restent utiles si les sous-agents ne sont pas disponibles.

Les skills existants dans `.agents/skills/` apportent des procédures spécialisées
et restent indépendants de ces rôles. Charger le skill utile, vérifier qu'il
correspond au besoin, puis appliquer la stack et les versions réelles du dépôt.

## Portabilité

Les rôles n'emploient ni syntaxe de tool calling propriétaire ni dépendance à un
modèle. Un outil compatible avec des instructions Markdown peut lire les mêmes
fichiers. Si un fournisseur propose une orchestration, des permissions ou des
fichiers d'instructions natifs, les ajouter comme adaptateurs optionnels; garder
les responsabilités, limites et workflow communs indépendants de ces outils.
