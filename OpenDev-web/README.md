# OpenDev Web

Interface communautaire React 19, TypeScript, Vite et Tailwind CSS, avec une base noir et blanc, des accents bleus pour la navigation, roses pour les réactions, verts pour les adhésions et des profils et visuels communautaires colorés.

## Démarrage local

Depuis `OpenDev-web` :

```powershell
npm ci
npm run dev
```

Pour choisir un port :

```powershell
npm run dev -- --host 127.0.0.1 --port 5180
```

Cette phase fonctionne entièrement avec des données de démonstration. Aucun backend, compte Supabase ni fichier `.env` n’est nécessaire pour explorer l’interface. Les boutons GitHub et Google simulent une connexion au même profil fictif ; ils n’effectuent aucun appel OAuth.

## Parcours disponibles

- Accueil : fil personnalisé par intérêts, abonnements et tri chronologique.
- Publications : texte, code, jusqu’à quatre images avec aperçu/retrait, réactions, commentaires, enregistrement, partage par lien et suppression confirmée des publications créées.
- Découvrir : bannière, recherche, catégories et filtre des communautés rejointes.
- Communautés : pages par slug, adhésion, filtres des discussions, ressources, projets et membres.
- Communautés officielles gérées par OpenDev et communautés créées par les membres : création, modification par le propriétaire et sélection des abonnés à inviter. Les invitations restent simulées et ne donnent pas automatiquement le statut de membre.
- Bannière : rotation toutes les trois secondes, pause au survol/clavier, commandes manuelles et exemple sponsorisé fictif. La préférence de rotation est conservée dans les paramètres ; les campagnes réelles et leur validation nécessiteront le backend.
- Paramètres : préférence de bannière, accès au profil et aux communautés, déconnexion.
- Entraide : l’auteur peut ajouter ou retirer le tag « Besoin d’aide », retenir un commentaire comme solution, changer de solution ou rouvrir la demande. La réponse utile et son auteur sont visibles sur la publication. Cet état est partagé entre les pages et conservé localement.
- Événements : calendrier mensuel, filtre par jour, inscriptions locales synchronisées avec la colonne droite. Les événements fournis sont fictifs et datés d’octobre 2026.
- Navigation : icônes pleines grises, sélection noire, noms sous les communautés et indicateurs d’activité non lue provenant des données de démonstration. Ouvrir une communauté la marque comme lue localement.
- Onboarding : sélection d’au moins trois centres d’intérêt et suggestions de communautés.
- Profils : suivi, abonnés/abonnements, publications, projets et communautés. Modification du profil personnel et ajout/modification de projets.
- Messagerie : conversations, filtres, messages locaux et brouillons séparés par conversation tant que la page reste ouverte. Sur mobile, la liste et la conversation ont chacune leur vue.
- Recherche globale, publications enregistrées, notifications et pages d’information.
- État invité, connexion de démonstration et déconnexion.

La navigation s’adapte aux petits écrans : rail des communautés dans une fenêtre accessible, navigation inférieure et colonne secondaire masquée. Les informations essentielles du profil sont déplacées dans le contenu principal.

## Données et limites de la démonstration

L’état partagé est conservé dans `localStorage` sous la clé `opendev:demo:v1`. Il inclut les préférences, le profil fictif, les communautés, les abonnements, les publications, les commentaires, les projets et les messages.

Les images de publication sont limitées à 5 Mo chacune, redimensionnées à 1 280 px maximum et converties en JPEG pour limiter la taille du stockage local. Les GIF deviennent des images fixes. Un avertissement apparaît si le navigateur refuse la sauvegarde ou si son quota est atteint : les modifications restent alors en mémoire jusqu’à la fermeture de la page.

Les pièces jointes de messagerie conservent uniquement leur nom et leur taille. Les documents des publications d’exemple sont des maquettes signalées comme telles. Aucun message n’est envoyé à une personne réelle. Les publications créées localement ne sont pas accessibles à d’autres navigateurs via leur lien de partage.

La déconnexion masque les vues personnelles mais conserve la démonstration. Pour repartir de zéro, supprimer la clé `opendev:demo:v1` dans les outils de développement du navigateur ou effacer les données du site.

## Organisation du frontend

- `src/state/catalog.ts` : catalogue mock, résolution des profils, catégories et recommandations.
- `src/state/DemoProvider.tsx` et `store.ts` : état partagé, persistance versionnée et actions de démonstration.
- `src/components/common` : contrôles réutilisables, avatars, fenêtre native avec gestion du focus et états vides.
- `src/components/auth` : connexion simulée et onboarding.
- `src/components/feed` : bannière, compositeur et publication utilisés dans plusieurs pages.
- `src/components/profile` : liste de développeurs et éditeurs de profil/projet.
- `src/components/layout` : navigation, rail et sidebar.
- `src/pages` : routes et composition des écrans.
- `src/index.css` : tokens, styles partagés et adaptations responsive.

La future intégration API devra remplacer la persistance et les actions du fournisseur de démonstration. `src/lib/supabase.ts` est conservé pour cette étape mais n’est pas utilisé par ces parcours. Les variables publiques `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` et `VITE_API_URL` restent prévues par la configuration existante.

## Vérifications

Voir le [bilan frontend du 13 octobre 2026](FRONTEND_REVIEW.md) pour les derniers contrôles, les rôles communautaires et les étapes d’intégration du backend.

```powershell
npm run lint
npm run build
```

La refonte a été vérifiée dans Chromium avec Playwright : onboarding, médias, publication, commentaire, réaction, enregistrement, suivi, filtres, profil, projets, messagerie, déconnexion, navigation clavier et suppression confirmée.

Douze écrans ont été parcourus aux largeurs 320, 390, 768, 1 024 et 1 440 px, sans débordement horizontal ni erreur JavaScript détectés. Les captures et scripts de vérification ponctuels restent dans `output/playwright/`, exclu de Git.

## Docker et CI/CD

Le [Dockerfile](Dockerfile) propose une cible `development` avec Vite et une cible `production` avec Nginx. La configuration du dépôt permet de démarrer l’ensemble des services depuis la racine : `docker compose up -d --build --wait`. Voir [les instructions Docker](../README.md#docker--développement).

Le workflow [web-ci.yml](../.github/workflows/web-ci.yml) s’exécute sur les push et pull requests concernés ainsi que manuellement. Il installe les dépendances, exécute ESLint, compile TypeScript, construit React et vérifie les images Docker. Le dossier `dist` est conservé comme artifact pendant 14 jours.

Le build natif utilise les variables GitHub publiques existantes. Le build Docker garde le proxy `/api/v1` vers FastAPI pour l’intégration ultérieure. Le déploiement Systalink reste à configurer.

## Connexion réelle aux données

Le mode par défaut utilise désormais Supabase Auth et FastAPI pour un premier ensemble de parcours. Voir [LIVE_INTEGRATION.md](LIVE_INTEGRATION.md) pour les fonctions raccordées, le démarrage, les vérifications et les fonctions restant à intégrer. Les descriptions de démonstration ci-dessus s’appliquent au mode explicite `VITE_DATA_MODE=demo`.
