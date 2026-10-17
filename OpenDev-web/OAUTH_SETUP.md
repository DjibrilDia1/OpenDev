# Activation de GitHub et Google — projet de développement

Les boutons sont déjà reliés à Supabase Auth. Ils restent désactivés tant que leurs fournisseurs n’ont pas de véritables identifiants OAuth enregistrés dans Supabase. L’ouverture de la fenêtre de connexion recharge leur disponibilité.

## Valeurs communes

| Champ | Valeur |
| --- | --- |
| Nom de l’application | OpenDev — Développement |
| Site / Homepage URL | `http://127.0.0.1:5174` |
| Callback chez GitHub et Google | `https://gkpbainuzdmpdvtzefxm.supabase.co/auth/v1/callback` |
| Retour vers OpenDev autorisé dans Supabase | `http://127.0.0.1:5174/` |

La callback des fournisseurs pointe vers Supabase ; Supabase renvoie ensuite le navigateur vers OpenDev. Ces valeurs concernent le projet de développement identifié localement, pas une future configuration de production.

## GitHub

1. Ouvrir [Créer une OAuth App](https://github.com/settings/applications/new) avec le compte qui possédera l’application.
2. Remplir le nom, la Homepage URL et l’Authorization callback URL avec le tableau ci-dessus. Laisser Device Flow désactivé.
3. Créer l’application et générer un Client Secret.
4. Dans [Supabase → Sign In / Providers](https://supabase.com/dashboard/project/gkpbainuzdmpdvtzefxm/auth/providers), ouvrir GitHub, coller le Client ID et le Client Secret, activer le fournisseur et enregistrer.

## Google

1. Ouvrir [Google Auth Platform](https://console.cloud.google.com/auth/overview) et sélectionner ou créer le projet de développement OpenDev.
2. Configurer Branding avec le nom OpenDev et les adresses d’assistance/contact choisies par le propriétaire. Pour des comptes Google de plusieurs organisations, choisir une audience externe. En mode test, ajouter les comptes autorisés dans Test users.
3. Dans Clients, créer un client OAuth de type Web application et ajouter la callback Supabase ci-dessus dans Authorized redirect URIs. Pour la connexion, utiliser uniquement les portées de base `openid`, `email` et `profile`.
4. Copier le Client ID et le Client Secret directement dans le fournisseur Google de Supabase, puis l’activer et enregistrer.

## URL de retour et essai

Dans [Supabase → URL Configuration](https://supabase.com/dashboard/project/gkpbainuzdmpdvtzefxm/auth/url-configuration), vérifier que le Site URL et la liste des Redirect URLs autorisent `http://127.0.0.1:5174/`. Si l’application est ouverte avec `localhost`, autoriser également `http://localhost:5174/` et rester sur la même origine pendant la connexion.

Fermer puis rouvrir « Se connecter ». Le fournisseur configuré devient cliquable. Effectuer un véritable essai de connexion pour chacun, accepter le consentement et vérifier le retour vers son propre profil. Refuser une connexion doit laisser la possibilité de réessayer.

Les secrets sont saisis uniquement dans les consoles GitHub/Google et Supabase. Ils ne vont ni dans le chat, ni dans le frontend, ni dans Git. La configuration publique de l’application continue à utiliser uniquement l’URL et la clé publiable Supabase.

## État au 15 octobre 2026

GitHub et Google ont été configurés par le propriétaire et sont maintenant activés. Le 15 octobre, les deux boutons ont été vérifiés depuis OpenDev : GitHub ouvre sa page de connexion et Google ouvre sa page de connexion, sans erreur de configuration observée à ce stade. Le consentement, le retour final et la création de session avec un compte personnel restent à vérifier par son propriétaire. Aucun secret ni compte personnel n’a été utilisé pendant ces contrôles.

Sources : [Supabase — GitHub](https://supabase.com/docs/guides/auth/social-login/auth-github), [Supabase — Google](https://supabase.com/docs/guides/auth/social-login/auth-google), [Supabase — Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
