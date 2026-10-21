# Première intégration aux données réelles — 15 octobre 2026

Le mode par défaut utilise Supabase Auth et l’API FastAPI. `VITE_DATA_MODE=demo` permet de rouvrir explicitement l’ancienne démonstration. Aucune donnée de `opendev:demo:v1` n’est importée dans les comptes réels.

## Parcours raccordés

- Inscription et connexion par e-mail/mot de passe ; confirmation d’e-mail selon la configuration Supabase. Restauration, renouvellement et déconnexion de session.
- OAuth GitHub/Google avec redirection vers l’origine de l’application. Les boutons sont désactivés si le fournisseur n’est pas activé dans Supabase.
- Lecture des profils, communautés publiques, publications et événements depuis FastAPI. Chargement, erreurs et états vides explicites, sans données fictives de repli.
- Création et modification du nom/de la description d’une communauté publique par son propriétaire ; adhésion et départ.
- Création de publications texte/code, modification/suppression par leur auteur, réponses et likes.
- Modification du nom, métier, bio, localisation, GitHub et site web du profil connecté.
- Participation et annulation de participation aux événements existants.
- Messages privés texte entre deux membres, historique et statuts de lecture.
- Notifications personnelles des messages, abonnements, commentaires et réactions.
- Enregistrement privé des publications et liste personnelle paginée.

Les requêtes API utilisent le jeton de session courant. FastAPI valide l’identité auprès de Supabase Auth et transmet le même jeton à PostgREST. Les données chargées restent en mémoire et sont vidées lors d’un changement de compte. Les préférences d’affichage/masquage de cette première intégration sont temporaires.

## Démarrage pour l’utilisateur

L’aperçu Docker actuellement configuré est `http://127.0.0.1:5174/`. Le proxy `/api/v1` atteint l’API locale. Ouvrir « Se connecter », puis « Créer un compte », confirmer son e-mail si demandé et se connecter. Créer ensuite une communauté publique et une publication. Les fournisseurs GitHub/Google doivent être activés séparément dans le tableau de bord Supabase avec leurs identifiants OAuth et les URL de redirection autorisées.

Pour Vite sans Docker, utiliser `VITE_API_URL=/api/v1` avec le proxy préparé dans `vite.config.ts`, ou autoriser explicitement l’origine du navigateur dans le CORS de l’API si une URL API absolue est utilisée. Ces réglages figurent dans les modèles `.env.example` ; les fichiers secrets locaux ne doivent pas être publiés.

## Périmètre restant

Communautés privées, demandes d’adhésion, rôles supplémentaires, médias des publications et pièces jointes des messages, promotions, signalements/modération, résolution des questions et gestion des projets/événements nécessitent encore des contrats et migrations supplémentaires. Les actions non prises en charge sont désactivées ou affichent leur indisponibilité. Aucune communauté ne peut être créée en « privé » puis enregistrée silencieusement comme publique.

Les listes initiales sont limitées aux 100 premières entrées par domaine. Les liens vers un profil ou une publication chargent désormais la ressource demandée hors de cette fenêtre. Messages, notifications et membres communautaires ont une pagination dédiée. La modification de LinkedIn et de la disponibilité reste désactivée. Les modèles de démonstration restent disponibles uniquement dans le mode explicite correspondant.

## Validation réalisée

- TypeScript/Vite, ESLint, Ruff et 11 tests Python (API, identité de requête, propriétaire et validation).
- Lectures réelles des quatre domaines via l’API locale : HTTP 200, projet de développement vide.
- Historique des migrations lié au même projet que l’API : migration initiale déjà appliquée, aucune migration supplémentaire appliquée pendant cette étape.
- Contrôle RLS sur le projet de développement confirmé par l’utilisateur : deux identités temporaires, publication membre, refus non-membre, modification interdite à un autre auteur, réponse, like et agrégats. Toutes les écritures ont été annulées par `ROLLBACK`, sans e-mail ni compte persistant. Script : `OpenDev-api/tests/rls_live_smoke.sql`.
- Navigateur : formulaires connexion/inscription, fournisseurs OAuth désactivés correctement, absence de session fictive, erreur API sans repli sur les mocks, refus HTTP 401 d’écriture anonyme et de jeton invalide ; absence de débordement à 390 px.

Le parcours complet avec confirmation de la boîte mail d’un véritable utilisateur reste à effectuer par son propriétaire. Aucun compte personnel n’a été utilisé et aucun e-mail de test n’a été envoyé. Les contrôles de la base et de l’API ne remplacent pas cette validation de session dans le navigateur.

## Informations de profil à l’inscription — 15 octobre 2026

L’inscription par e-mail demande désormais le nom complet et le métier/spécialité ; la bio et la localisation sont facultatives. Les champs publics sont transmis dans les métadonnées d’inscription, puis copiés par le déclencheur de création du profil dans la même transaction que le compte Auth. La migration `202610150001_signup_profile_details.sql` est appliquée au projet de développement confirmé. Les mots de passe, e-mails et données de permissions ne sont pas copiés dans le profil public.

Après GitHub/Google, ou pour un ancien compte incomplet, une étape préremplie demande les informations manquantes. `PUT /profiles/me/onboarding` valide les champs et modifie uniquement le profil du demandeur avec son jeton et les règles RLS. L’état de complétion dépend du nom et du métier réellement relus depuis le serveur ; fermer cette étape déconnecte le compte au lieu de simuler une validation. Un échec conserve les champs saisis.

Validation complémentaire : 17 tests Python, Ruff, build et ESLint réussis. Neuf contrôles de parcours navigateur réussis avec Auth/API interceptées pour ne pas créer de compte ou envoyer d’e-mail. Persistance réelle et isolation vérifiées séparément dans Supabase avec `tests/signup_profile_smoke.sql`, avant et après migration, transactions annulées sans conserver les comptes de test. La réception du véritable e-mail et la connexion complète à un compte personnel restent à valider par son propriétaire.

## Personnalisation du profil — 16 octobre 2026

Trois crayons réservés au propriétaire ouvrent les fenêtres de modification du profil, de la couverture et des compétences. Sur mobile, un accès à la stack est aussi présent dans les détails du profil. Le profil et la stack sont enregistrés avec `PATCH /profiles/me`, sous l’identité courante. Les compétences sont nettoyées, dédupliquées et limitées à dix éléments de 40 caractères. Les champs `tags` et `cover_url` sont relus dans le profil et l’annuaire public.

La couverture accepte JPG, PNG et WebP jusqu’à 5 Mo. Le navigateur décode, redimensionne et réencode l’image en JPEG sans reprendre les métadonnées originales. Supabase Storage reçoit l’image avec la session de l’utilisateur, dans `profile-covers/<user-id>/<uuid>.jpg`. Le bucket impose 5 Mo et des types image autorisés ; les politiques limitent les écritures et suppressions au dossier de l’utilisateur. Les couvertures sont publiques, comme le profil. [Référence Supabase sur les politiques Storage](https://supabase.com/docs/guides/storage/security/access-control).

La migration `202610160001_profile_customization.sql` est appliquée au projet de développement dédié autorisé. Les anciennes images restent conservées lors du remplacement ou du retrait ; un nettoyage des objets non référencés reste à prévoir. Une image nouvellement envoyée est supprimée si l’API rejette explicitement la sauvegarde ; en cas de résultat réseau incertain elle est conservée pour éviter de supprimer une couverture potentiellement enregistrée.

Contrôles de cette étape : compilation TypeScript/Vite, ESLint et Ruff réussis. Aucun test automatisé ni enregistrement sur un compte personnel exécuté pour cette étape.

## Première connexion et nom d’utilisateur — 16 octobre 2026

Le chargement global affiche un indicateur circulaire centré ; son libellé reste accessible aux lecteurs d’écran. Le pop-up de première connexion demande désormais un nom d’utilisateur choisi, le nom complet et le métier. Bio, localisation, stack, GitHub et portfolio peuvent être renseignés dans la même fenêtre. Les champs publics sont préremplis depuis le profil existant, y compris après OAuth.

`GET /me/username-availability` vérifie un nom sous l’identité connectée et exclut le propre profil du demandeur. Les vérifications sont temporisées pendant la saisie, puis répétées avant sauvegarde. Un index unique sur `lower(username)` protège contre les doublons et réservations concurrentes. Le conflit HTTP 409 conserve le formulaire et demande un autre nom. Le nom reste modifiable dans l’éditeur du profil.

`PUT /profiles/me/onboarding` enregistre atomiquement les informations et `onboarding_completed_at`. Ce marqueur persistant pilote la fermeture du parcours ; les comptes existants complètent une fois le formulaire prérempli. Les champs facultatifs peuvent rester vides. Fermer le parcours déconnecte l’utilisateur. La migration `202610160002_profile_onboarding.sql` est appliquée au projet de développement autorisé.

Contrôles : compilation TypeScript/Vite, ESLint et Ruff réussis. Les données d’entrée des tests existants ont été adaptées au nom d’utilisateur désormais obligatoire ; aucun test n’a été ajouté ou exécuté durant cette étape. Le parcours sur un compte personnel reste à valider.

## Parcours par étapes et personnalisation — 16 octobre 2026

Le pop-up utilise une grande largeur, des champs sur deux colonnes sur ordinateur et une zone centrale défilante sur petit écran. Trois étapes : profil, thèmes/compétences, puis liens et suggestions de communautés. « Suivant » reste désactivé tant que le nom/métier/nom d’utilisateur disponible ne sont pas valides, puis tant qu’aucun thème n’est sélectionné. Les champs facultatifs peuvent rester vides. Le titre doublonné, le texte explicatif sous le nom d’utilisateur et le lien de déconnexion ont été retirés. Le bouton de fermeture conserve la déconnexion lors du premier parcours incomplet.

Entrée ajoute une compétence sans soumettre le formulaire. Les compétences apparaissent dans le champ en badges bleus, texte gras, avec retrait individuel. Les préférences sont enregistrées à la confirmation finale, avec les compétences et le profil. Elles sont restaurées à la connexion suivante. « Modifier mes intérêts » sur le profil rouvre le parcours à l’étape des thèmes.

La migration `202610160003_profile_interests.sql` crée `profile_preferences`, table privée avec RLS réservée au propriétaire et accès anonyme interdit. L’API accepte de 1 à 8 thèmes de la liste proposée. Elle enregistre les préférences avant de marquer le profil comme complété ; si la seconde écriture échoue, les préférences déjà enregistrées restent conservées et le formulaire peut être renvoyé. Aucun compte n’est abonné automatiquement à une communauté.

Une première personnalisation classe les publications « Pour toi » et les communautés de découverte selon les correspondances entre les thèmes choisis et leurs titres, descriptions et tags de publication. Les suggestions du parcours utilisent les communautés réellement chargées ; un état vide remplace les suggestions fictives. Ce classement concerne les données du lot chargé, actuellement limité à 100 éléments par domaine.

Migration appliquée au projet de développement autorisé. Compilation, ESLint et Ruff contrôlés ; aucun test exécuté ni inscription personnelle réalisée pour cette étape.

## Parcours actuel — 18 octobre 2026

Le parcours utilise six étapes : profil, technologies, intérêts, communautés, personnes, récapitulatif. Les sections datées ci-dessus décrivent les versions antérieures. L’en-tête conserve « Complète ton profil ! ». Les champs essentiels portent une étoile ; localisation et école ne sont plus proposées dans cet écran. Leurs valeurs existantes restent conservées.

L’inscription demande prénom, nom, nom d’utilisateur, e-mail, mot de passe et confirmation. L’écran de confirmation permet le renvoi de l’e-mail ; la connexion garde ses liens d’inscription et de récupération en bas à gauche. Supabase gère les confirmations, sessions, connexions sociales et changements de mot de passe. Un lien dans les paramètres ouvre le changement de mot de passe authentifié. La confirmation e-mail et les URL de retour doivent aussi être configurées dans les paramètres Auth du projet utilisé ; la configuration locale les active pour les tests.

Un nom d’utilisateur contient de 1 à 30 caractères Unicode en minuscules, sans liste de caractères imposée. La saisie est convertie en minuscules. Les contraintes SQL et l’index unique protègent l’unicité. Les endpoints de disponibilité utilisent une égalité exacte, avec encodage HTTP, afin de traiter espaces, accents et ponctuation littéralement. Les statuts disponible/indisponible apparaissent en vert/rouge.

Le catalogue de technologies et d’intérêts provient de `GET /onboarding/catalog`. La recherche de technologies affiche seulement les correspondances après saisie ; Entrée ajoute la correspondance exacte ou unique sous forme de badge bleu gras. Les brouillons privés sont enregistrés après 650 ms et avant chaque changement d’étape via `GET/PUT /me/onboarding`. Après rafraîchissement, la dernière sauvegarde reprend à la bonne étape. Les erreurs de sauvegarde restent visibles et permettent de réessayer.

La finalisation `PUT /profiles/me/onboarding` appelle une transaction SQL sous l’identité du demandeur : profil, préférences et suppression du brouillon réussissent ensemble. Les routes privées restent protégées et le fil n’est pas monté avant la fin du parcours. Après validation, l’utilisateur arrive à l’accueil ; la reconnexion conserve ce statut.

Les adhésions utilisent les endpoints communautaires existants. `PUT/DELETE /profiles/{uuid}/follow` enregistre les abonnements avec RLS ; aucun suivi de soi-même n’est accepté. Les suggestions chargent les vrais profils et communautés. Les préférences privées ne sont pas exposées dans l’annuaire. Les avatars sont préparés en JPEG puis envoyés dans `profile-avatars/{user_uuid}/...` avec le token de l’utilisateur.

Le classement « Pour toi » donne 1000 points à un auteur suivi, 500 à une communauté rejointe, jusqu’à 160 aux intérêts et 100 aux technologies, puis un bonus d’engagement plafonné à 9 pour le contenu pertinent. La récence départage les scores égaux. Ce classement porte sur le lot de 100 publications actuellement chargé. Un état vide invite à découvrir des communautés quand aucune publication réelle n’est disponible.

Migrations `202610170001_complete_onboarding.sql` et `202610180001_username_policy.sql` présentes dans le projet de développement. L’historique de 170001 a été réconcilié après comparaison complète avec le schéma déjà appliqué. Les contrôles SQL de `OpenDev-api/tests/*smoke.sql` utilisent des transactions annulées.

### Vérifications reproductibles

- API : `.venv/Scripts/python.exe -m pytest -q -p no:cacheprovider` et `.venv/Scripts/ruff.exe check app tests`.
- Frontend : `npm run build` et `npm run lint`.
- Interface : `tests/browser/onboarding-adjustments.js`, à lancer avec `playwright-cli run-code --filename`, sur le serveur de développement 5174. Les réponses Auth/API de ce scénario sont interceptées dans un navigateur isolé.
- Parcours réel : `tests/browser/auth-onboarding.js`, avec Vite 5175, FastAPI 8001, Supabase local 55321 et Mailpit 55324. Le frontend et l’API de ce test utilisent la configuration publique du Supabase local. Ce scénario crée des comptes `example.test`, confirme les e-mails capturés localement, téléverse un avatar, rejoint/quitte une communauté, suit/ne suit plus un membre, vérifie son contenu, recharge, se reconnecte puis change le mot de passe. Il n’intercepte aucune réponse réseau et n’utilise aucun compte personnel. Les données de test restent dans l’instance locale.

Validation effectuée : 45 tests API et 16 contrôles d’interface réussis, parcours Auth réel réussi sur la pile locale, contrôles SQL de noms d’utilisateur, RLS et transaction atomique réussis. La réception d’e-mails dans une boîte externe et l’autorisation finale Google/GitHub sur un compte personnel nécessitent leur configuration externe ; elles ne sont pas simulées comme des validations réelles.

## Messages et notifications — 18 octobre 2026

`/messages` utilise les conversations privées du compte connecté. « Message » sur un profil ou « Nouveau message » ouvre une conversation à deux ; la recherche interroge les profils réels. Les messages texte sont limités à 5000 caractères, enregistrés en base, paginés par séquence et marqués lus lors du chargement de la conversation visible. Le jeton du demandeur traverse toujours FastAPI jusqu’à Supabase. Un UUID d’envoi conservé lors d’une erreur réseau rend le nouvel essai idempotent. Les mentions « Envoyé » et « Lu » proviennent du message enregistré et du curseur de lecture de l’autre participant.

`/notifications` affiche les événements créés par les déclencheurs SQL : message reçu, nouvel abonnement, commentaire ou réponse, et réaction à une publication. Aucune autonotification n’est créée. Les changements répétés d’abonnement ou de réaction ne multiplient pas les notifications existantes. Les notifications ne contiennent pas le texte privé des messages. Lecture individuelle, lecture de l’ensemble jusqu’à la date de la dernière notification chargée, filtres et pagination date/UUID sont disponibles. Les compteurs de navigation reflètent les données privées du compte.

Les listes et compteurs sont actualisés toutes les huit secondes lorsque l’onglet est visible, puis à son retour au premier plan. Les données et brouillons de messagerie restent isolés par compte en mémoire. Les historiques se rechargent depuis le serveur. Les longs rattrapages conservent un accès paginé à l’historique. L’interface n’affiche pas de faux statut de présence et propose uniquement l’envoi de texte dans le mode réel.

La migration `202610180003_messaging_notifications.sql` a été appliquée localement puis au projet Supabase de développement autorisé. Les trois tables ont RLS activé : seuls les participants lisent les conversations/messages, et seul le destinataire lit ses notifications. Les écritures utilisateur directes sont révoquées ; les mutations passent par des RPC à identité vérifiée, chemin SQL fixe et droits d’exécution restreints. La revue statique a couvert ces règles ainsi que les contrats API/UI et les demandes concurrentes.

Contrôles exécutés pour cette étape : compilation TypeScript/Vite, ESLint, Ruff, format des nouveaux fichiers API et vérification structurelle de la migration locale. Aucun test automatisé ni scénario d’envoi entre comptes n’a été ajouté ou exécuté pour cette étape. Les pièces jointes et les notifications push du navigateur ne sont pas implémentées.

## Enregistrements et compléments des notifications — 19 octobre 2026

Le marque-page enregistre ou retire une publication sous l’identité du compte connecté. L’état change après confirmation du serveur ; les boutons sont désactivés pendant la requête et les erreurs permettent un nouvel essai idempotent. Les enregistrements sont restaurés depuis `/me/state` à la reconnexion. Un changement de compte pendant l’action ne fait pas appliquer la demande à une autre identité.

`/enregistres` charge les publications complètes par lots de vingt, indépendamment du lot de publications du fil. Le curseur combine date d’enregistrement et identifiant de publication. Les pages déjà chargées sont conservées lors d’un retrait. La liste se consulte depuis le raccourci de navigation et le menu mobile. Les sauvegardes sont privées : elles ne créent aucune notification et ne sont pas visibles par l’auteur du contenu.

Les notifications proposent des filtres par type (messages, abonnements, commentaires, réactions), combinables avec les non-lues, et une action « Marquer comme lue » distincte de l’ouverture. Les filtres portent sur les notifications chargées ; la pagination permet de parcourir les plus anciennes. Les compteurs sont relus après confirmation de lecture. Les erreurs d’action restent affichées séparément des erreurs de chargement.

La migration `202610190001_saved_posts.sql` a été appliquée localement puis au projet Supabase de développement autorisé. Elle active RLS, limite lecture/insertion/suppression au propriétaire, réserve la date d’enregistrement au serveur et utilise des fonctions SQL invoker. Compilation TypeScript/Vite, ESLint et Ruff réussis ; présence de la table et de ses trois politiques RLS confirmée en développement. Aucun test ajouté ou exécuté pour cette étape.

## Communautés, modération et calendrier — 19 octobre 2026

La page communauté propose un onglet Général avec les publications de tous types, une étiquette à droite, puis les onglets spécialisés et la liste paginée des membres. Les cartes de l’accueil utilisent la même présentation. Le bloc central d’équipe est retiré ; les responsables et les membres figurent dans la barre latérale, avec les ressources, la charte et les événements. Les statistiques proviennent des agrégats serveur. Les communautés officielles affichent « Administrée par OpenDev ».

Le gestionnaire utilise les droits relus depuis l’API. Le propriétaire peut modifier nom, description, catégorie, couverture, charte et jusqu’à six ressources ; il attribue le rôle modérateur à un membre existant et choisit séparément les droits de modification, gestion des membres, modération et gestion des événements. Les permissions sont contrôlées en base sur chaque action. Un modérateur ne peut pas se promouvoir ni déléguer ses droits. Les retraits de membres, événements et communauté demandent une confirmation ; la suppression de communauté exige la saisie du nom et refuse une communauté non vide. Les communautés restent publiques.

Les événements ont un titre, une description, un début, une fin, un format, un lieu ou lien, une capacité facultative et un lien d’information. Les dates saisies dans le fuseau du navigateur sont envoyées avec leur fuseau puis affichées localement. Le calendrier interroge l’API par mois, y compris pour les événements passés ; les liens de notification ouvrent le mois et le jour concernés. Les places affichées proviennent des inscriptions réelles. Le serveur réserve une place sous verrou et refuse le dépassement de capacité. Les créations, changements et annulations alimentent les notifications ; le bouton cloche enregistre la préférence communautaire.

Sur le profil, un crayon dans l’en-tête des intérêts remplace le lien d’édition. Le bouton de déconnexion passe du gris au rouge au survol et au focus clavier. Les suppressions de publications et de réponses sont disponibles aux modérateurs possédant le droit correspondant.

Migrations 002/003 appliquées localement puis au projet de développement autorisé. Revue statique des accès et de la concurrence effectuée. Compilation TypeScript/Vite, ESLint et Ruff contrôlés ; aucun test fonctionnel, d’autorisation ou de concurrence ajouté ou exécuté pour cette étape.

## Éditeur et catalogue technologique — 19 octobre 2026

L’éditeur de publication utilise une fenêtre allant jusqu’à 920 × 760 px, limitée à la taille de l’écran. L’auteur, la destination et le type apparaissent en tête ; la zone de rédaction et le code défilent séparément du pied de fenêtre qui conserve le compteur et le bouton Publier. Le brouillon reste disponible après fermeture. Pendant l’envoi, les contrôles et la fermeture sont bloqués ; une erreur d’actualisation après enregistrement ne transforme pas une publication réussie en échec d’envoi. Le mode réel propose texte, liens et code ; les aperçus d’images restent propres à la démonstration.

Le catalogue officiel actif comporte React, Python, TypeScript et FastAPI. Huit communautés généralistes sont archivées : Design Systems, Open Source, IA & Data, DevOps & Cloud, Mobile, Creative Coding, Game Dev et Security. Les identifiants, adhésions et contenus sont conservés. Le catalogue, les listes de publications et le calendrier excluent ces archives ; la base refuse les nouvelles publications, événements, adhésions et inscriptions aux événements de ces communautés. Les noms restent réservés par un index unique sur `lower(btrim(name))`, y compris après archivage. Une collision à la création ou au renommage affiche un message explicite.

Les quatre technologies utilisent leurs véritables logos, téléchargés depuis les sources officielles et intégrés aux fichiers du site. FastAPI possède son propre logo ; TypeScript utilise son emblème bleu officiel. La provenance est documentée dans `src/assets/emblems/SOURCES.md`.

La migration `202610190004_technology_catalog.sql` a été appliquée localement et au projet Supabase de développement autorisé. Les vérifications de cette étape portent sur la compilation TypeScript/Vite, ESLint, Ruff et la structure du catalogue en base. Aucun test fonctionnel n’a été ajouté ou exécuté.

## Thème, ajustements du fil et comptes entreprise — 19 octobre 2026

Le bouton lune/soleil en haut de la barre des communautés bascule entre les modes clair et sombre, avec le même accès dans le menu mobile. Le choix est conservé dans le navigateur et synchronisé entre ses onglets ; sans choix enregistré, la préférence système est utilisée. Les surfaces, champs et textes utilisent des couleurs adaptées au thème. Les menus des publications utilisent des icônes SVG grises et les types de publication des badges en nuances de gris.

La recherche s’élargit au focus, puis se réduit à la perte de focus ou après validation, sans effacer la requête. La transition respecte la préférence de réduction des animations. L’éditeur est ramené à 780 × 640 px maximum et la zone de texte à 210 px initialement ; le contour de focus reste contenu dans la zone de défilement.

L’inscription, le parcours initial et la modification du profil proposent « Particulier » ou « Entreprise ». Une entreprise renseigne son nom (1 à 100 caractères), son nom d’utilisateur et son activité ; le logo, la présentation et les liens restent facultatifs. Les champs prénom, nom, expérience personnelle et employeur ne lui sont pas imposés. Le type de compte et le nom d’entreprise passent par les métadonnées d’inscription, le brouillon privé et la finalisation atomique. Le profil public indique le type Entreprise et le nom d’entreprise sert de nom affiché.

La migration `202610190005_company_accounts.sql` ajoute `account_type` et `company_name` en conservant le champ `company` comme employeur facultatif des particuliers. Les profils existants restent de type particulier. Un déclencheur et une contrainte synchronisent l’identité d’entreprise, y compris pour les écritures directes autorisées par RLS. Les entreprises gardent les mêmes droits que les particuliers ; ce type n’accorde ni administration ni certification. Le logo utilise le téléversement d’avatar existant sous l’identité du compte.

Migration005 appliquée localement puis au projet Supabase de développement autorisé. Revue statique des contrats UI/API, des contraintes et des droits effectuée. Compilation TypeScript/Vite, ESLint, Ruff et contrôle structurel du schéma réalisés ; aucun test fonctionnel ni scénario d’inscription ou de thème exécuté.

## Ressources des publications — 19 octobre 2026

L’éditeur réel propose Images, Documents, Lien et Code. Une publication peut contenir jusqu’à six ressources au total : quatre images JPG/PNG/WebP de 5 Mo maximum chacune, deux documents PDF/TXT/Markdown de 10 Mo maximum chacun, ainsi que des liens HTTP(S) avec titre dans cette limite globale. Les fichiers sont sélectionnés localement avec aperçu et retrait avant publication ; leur envoi commence au clic Publier. Le brouillon reste disponible en mémoire après fermeture ou erreur. Quitter la page avec un brouillon déclenche l’avertissement du navigateur ; les fichiers sélectionnés ne sont pas restaurés après rechargement.

Les fichiers sont envoyés sous l’identité du compte dans le bucket public `post-resources`, à un chemin UUID immuable. Le formulaire affiche la progression, bloque la fermeture pendant l’envoi et conserve les références déjà envoyées pour une reprise. La validation API et le déclencheur SQL contrôlent type, nombre, taille, extension, MIME et propriétaire des objets Storage ; un chemin public copié ne suffit pas à rattacher le fichier d’un autre utilisateur. Aucun jeton privilégié n’est utilisé. Les liens externes ne sont pas récupérés par le serveur et n’introduisent ni HTML ni iframe dans le fil.

`posts.resources` est restitué par `post_directory`, les pages de publication et les publications enregistrées. La galerie permet d’agrandir les images ; les documents proposent Ouvrir et Télécharger ; les liens affichent leur titre et leur domaine. Les styles utilisent les couleurs des thèmes clair et sombre. Une ressource seule peut être publiée, avec son titre ou nom de fichier comme légende de repli.

Le bucket interdit le remplacement et la suppression utilisateur des fichiers. Les objets non publiés après un échec, retirés d’un brouillon ou associés à une publication supprimée restent conservés ; aucune purge automatique n’est implémentée. Les ressources sont destinées à des publications publiques.

Migration `202610190006_post_resources.sql` appliquée localement puis au projet Supabase de développement autorisé. Revue statique des contrats et politiques Storage, compilation TypeScript/Vite, ESLint, Ruff et inspection structurelle du schéma effectuées. Aucun test fonctionnel de téléversement ou scénario navigateur exécuté.

## Canaux des communautés — 20 octobre 2026

Chaque communauté possède un canal Général par défaut ; les nouvelles communautés le reçoivent automatiquement. Les anciennes publications des communautés actives sont rattachées à ce canal. Le fil hors communauté garde un canal nul. La navigation `?canal=<UUID>` sélectionne un canal et permet un lien direct depuis le contexte de chaque publication, y compris dans l’accueil, les profils et les enregistrements.

Le bouton Gérer les canaux est réservé au propriétaire et aux modérateurs disposant de `edit_community`. Il permet de créer, renommer, décrire, ordonner, passer en lecture seule, archiver, restaurer et supprimer un canal vide. Le canal par défaut ne peut être supprimé ni archivé. Les noms sont uniques dans une communauté, sans distinction de casse et après retrait des espaces extérieurs, y compris pour les archives. La limite est de cinquante canaux actifs par communauté.

Les canaux restent publics dans les communautés publiques. Un canal archivé conserve ses échanges et refuse toute nouvelle publication ou réponse, y compris de la modération. Les corrections de contenus existants dans une archive sont réservées aux responsables disposant de `edit_community` ou `moderate_posts`, avec la règle auteur toujours appliquée. Dans un canal en lecture seule, ces mêmes responsables peuvent publier et répondre. La suppression de son propre contenu et la modération conservent les droits existants. Ces règles sont contrôlées par les déclencheurs SQL, même lors d’un appel direct à la Data API.

Le fil charge les publications par canal, avec pagination et recherche sur l’historique complet. Les filtres Tout, Discussions, Entraide, Projets et Ressources restent disponibles. L’actualisation après une mutation conserve les publications visibles et les réponses ouvertes. Les réponses réseau obsolètes ne remplacent pas les données du canal ou du compte actuellement affiché.

L’éditeur propose le canal Général par défaut et le choix d’un canal actif pour toute destination communautaire. Il vérifie la destination avant envoi et conserve le brouillon et les ressources préparées en cas d’erreur. Un canal introuvable n’est pas remplacé silencieusement par Général.

Migration `202610190007_community_channels.sql` appliquée localement puis au projet Supabase de développement autorisé. Revue statique des relations, droits, verrous et contrats UI/API effectuée. Compilation TypeScript/Vite, ESLint, Ruff et inspection structurelle de la migration réalisées ; aucun test fonctionnel ou scénario d’autorisation/concurrence exécuté.

## Score de contribution et reconnaissance — 20 octobre 2026

Le score public est calculé par PostgreSQL depuis les contributions conservées. Les comptes particuliers et entreprises suivent les mêmes règles. Il apparaît près des auteurs de publications et de réponses, dans les listes de membres et de personnes, ainsi que sur les profils. Le panneau du profil présente le détail des points, les remerciements reçus, les solutions retenues et la progression : Découverte, Contributeur à 50 points, Engagé à 200, Référent à 500 et Pilier à 1500. Ces niveaux n’accordent aucun droit d’administration.

Barème avec plafonds par journée UTC : publication +2 (3/jour), bonus d’une publication Ressource comportant une pièce jointe, un lien ou du code +3 (2/jour), première réponse à la publication d’un autre membre +2 (5/jour), remerciement reçu en entraide +5 (10/jour), solution retenue par l’auteur de la question +15 (3/jour). Un même donateur ne rapporte des points au même destinataire qu’une fois par question et une fois par jour. Les remerciements au-delà des plafonds restent visibles sans augmenter les points. Connexions, abonnements et mentions J’aime n’attribuent aucun point.

Les réponses aux questions proposent les mentions Merci, Utile et Très clair, de valeur identique. Un compte peut changer ou retirer sa mention ; il ne peut pas remercier sa propre réponse. Seul l’auteur de la question peut retenir une réponse d’un autre membre comme solution, remplacer son choix ou rouvrir la question. Les choix sont persistés en base et les scores sont relus après mutation. Les données absentes ou en erreur ne deviennent pas de faux scores à zéro ; le panneau propose un nouvel essai.

Le score est un total actuel et réversible : suppression, retrait et archivage de contenus peuvent le réduire, puis libérer une place sous un plafond quotidien pour une autre contribution. Les contributions historiques éligibles sont incluses. Les dates de création des nouvelles publications et réponses sont fixées côté serveur et restent immuables, avec leurs identités. Les tables de reconnaissance n’acceptent aucune écriture directe depuis le navigateur. Les RPC limitent les mutations à l’identité Supabase et les agrégats publics ne révèlent pas les identités des donateurs. Les canaux et adhésions conservent leurs règles d’accès. Les plafonds limitent les échanges artificiels de points ; ils ne constituent pas une détection de comptes multiples.

Migration `202610200001_contribution_scores.sql` appliquée localement puis au projet Supabase de développement autorisé. Les contrats API et l’interface conservent les jetons du demandeur et utilisent des lectures de scores par lots, sans requête par auteur. Revue statique sécurité/intégration effectuée ; compilation TypeScript/Vite, ESLint et Ruff réussis, droits RLS/RPC confirmés par lecture des métadonnées locales et distantes. Aucun test automatisé ni scénario navigateur exécuté pour cette étape. L’avertissement Vite existant sur la taille du bundle reste présent.
