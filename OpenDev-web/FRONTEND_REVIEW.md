# Revue frontend — 13 octobre 2026

## Périmètre

Frontend de démonstration React, contrôlé dans Chromium à partir de l’aperçu local. Les comptes OAuth, invitations, messages, signalements, inscriptions et permissions utilisent encore le stockage local. Cette revue valide les parcours de l’interface ; elle ne valide pas la sécurité d’une application connectée.

## Fonctionnalités finalisées

- Navigation mobile : repère noir au-dessus de la page active, menu personnel, publication et messagerie accessibles en haut.
- Menu de publication : favoris, partage, suivi, masquage réversible, signalement avec motif. Modification et suppression confirmée pour l’auteur ; retrait et restauration pour l’équipe de la communauté.
- Entraide : appel à l’aide, réponse retenue et attribution, résolution et réouverture.
- Équipe de communauté : propriétaire, plusieurs administrateurs et modérateurs. Les communautés officielles ont une équipe de démonstration OpenDev ; les propriétaires de communautés de membres choisissent leur équipe dans l’éditeur.
- Calendrier, médias, profils, recherche et messagerie conservés et contrôlés.

## Droits représentés dans l’interface

| Action | Propriétaire | Administrateur | Modérateur | Membre |
| --- | --- | --- | --- | --- |
| Modifier la présentation et inviter | Oui | Oui | Non | Non |
| Nommer ou retirer des responsables | Oui | Non | Non | Non |
| Retirer/rétablir des publications | Oui | Oui | Oui | Non |
| Modifier le texte d’un autre auteur | Non | Non | Non | Non |
| Résoudre une demande d’aide | Auteur uniquement | Auteur uniquement | Auteur uniquement | Auteur uniquement |

Les nominations restent des opérations locales de démonstration. Aucune invitation ni notification réelle n’est envoyée. Un administrateur qui enregistre une modification conserve le propriétaire existant.

## Vérifications

- Compilation TypeScript et build Vite ; ESLint.
- 14 routes sur 5 largeurs : 320, 390, 768, 1024 et 1440 px, soit 70 combinaisons. Aucun débordement horizontal, image cassée détectée ou exception JavaScript sur ces passages.
- 35 assertions fonctionnelles : onboarding, favoris, menus, masquage, signalement, équipe, permissions, entraide, modération, navigation mobile, calendrier, médias, suppression, profil, messages et reconnexion.
- Audit axe WCAG A/AA sur 9 vues et 3 fenêtres/menus. Le défaut de navigation clavier dans les extraits de code a été corrigé.
- Scripts et captures ponctuels dans `output/playwright/`, ignorés par Git. Ils ne constituent pas une suite de tests installée dans la CI.

## Passage au backend

La base frontend est prête pour l’intégration. Les prochains travaux sont :

1. Remplacer la connexion simulée par Supabase Auth et transmettre le jeton de l’utilisateur à FastAPI.
2. Modéliser communautés, adhésions, rôles, invitations et acceptation. Faire appliquer les droits par FastAPI et les politiques RLS ; les contrôles visuels ne sont pas une protection.
3. Persister publications, commentaires, réponses retenues, réactions, favoris et préférences de masquage. Déplacer les images vers le stockage de fichiers.
4. Ajouter signalements, journal de modération, retrait/restauration et notifications réelles. Le retrait d’un contenu doit être distinct du masquage personnel.
5. Brancher calendrier, inscriptions, recherche paginée et messagerie. Couvrir les chargements, erreurs réseau et conflits avec des tests d’intégration sur de vrais comptes.

Pas de déploiement ni de push inclus dans cette revue.

## Complément du 14 octobre 2026 — administration et confidentialité

- En-tête ordinateur réduit à 60 px, navigation recentrée, icônes et libellés réduits, accès au profil à droite. Menu des publications enrichi d’emojis décoratifs.
- Choix public/privé, couverture importée (JPG/PNG/WebP, 5 Mo maximum, image redimensionnée), paramètres et demandes d’adhésion accessibles aux administrateurs. Les rôles restent gérés par le propriétaire.
- Publications privées filtrées dans la source partagée du fil, de la recherche et des profils. Membres et calendrier masqués aux non-membres. Un membre accepté peut publier ; quitter retire son accès.
- Calendrier par communauté, événements créés/modifiés/supprimés par l’administration, inscriptions locales et intégration au calendrier global. Les événements privés suivent les droits de lecture.
- Trois propositions vectorielles de logo dans `public/opendev-logos.html`. Logo actuel conservé en attendant le choix utilisateur.

Validation complémentaire : build TypeScript/Vite et ESLint réussis ; 19 contrôles ciblés réussis, dont 5 largeurs (320, 390, 768, 903, 1480 px), import de couverture persistant, demande/acceptation/départ, accès privé, calendrier et menus. Audit axe de la page communauté sans violation détectée. Les 70 combinaisons de la revue précédente n’ont pas toutes été rejouées sur cette itération.

Aperçu dédié utilisé : http://127.0.0.1:5181/ (l’ancien port 5174 ne servait plus ces fichiers lors de la reprise). Les données sont locales à chaque origine : changer de port ne transfère pas la session de démonstration.

Avant production : appliquer les permissions public/privé, les rôles et les demandes côté API/Supabase RLS ; stocker les couvertures et événements côté serveur. Le filtrage frontend local ne constitue pas une protection de données confidentielles.
