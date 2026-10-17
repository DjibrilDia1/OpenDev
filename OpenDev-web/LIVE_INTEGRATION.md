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

Les requêtes API utilisent le jeton de session courant. FastAPI valide l’identité auprès de Supabase Auth et transmet le même jeton à PostgREST. Les données chargées restent en mémoire et sont vidées lors d’un changement de compte. Les préférences d’affichage/masquage de cette première intégration sont temporaires.

## Démarrage pour l’utilisateur

L’aperçu Docker actuellement configuré est `http://127.0.0.1:5174/`. Le proxy `/api/v1` atteint l’API locale. Ouvrir « Se connecter », puis « Créer un compte », confirmer son e-mail si demandé et se connecter. Créer ensuite une communauté publique et une publication. Les fournisseurs GitHub/Google doivent être activés séparément dans le tableau de bord Supabase avec leurs identifiants OAuth et les URL de redirection autorisées.

Pour Vite sans Docker, utiliser `VITE_API_URL=/api/v1` avec le proxy préparé dans `vite.config.ts`, ou autoriser explicitement l’origine du navigateur dans le CORS de l’API si une URL API absolue est utilisée. Ces réglages figurent dans les modèles `.env.example` ; les fichiers secrets locaux ne doivent pas être publiés.

## Périmètre restant

Cette étape utilise le schéma public initial. Communautés privées, demandes d’adhésion, rôles supplémentaires, couvertures et médias, promotions, signalements/modération, résolution des questions, suivi, favoris, messages, notifications et gestion des projets/événements nécessitent des contrats et migrations supplémentaires. Les actions non prises en charge sont désactivées ou affichent leur indisponibilité. Aucune communauté ne peut être créée en « privé » puis enregistrée silencieusement comme publique.

Les listes initiales sont limitées aux 100 premières entrées par domaine ; pagination et chargement des profils/publications hors de cette fenêtre restent à compléter. La modification de LinkedIn et de la disponibilité reste désactivée. Les modèles de démonstration restent disponibles uniquement dans le mode explicite correspondant.

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
