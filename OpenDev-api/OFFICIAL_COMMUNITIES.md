# Communautés officielles OpenDev

La migration `202610180002_official_communities.sql` ajoute `is_official` et
`category` aux communautés, sans créer de compte utilisateur. Les communautés
officielles utilisent les mêmes adhésions, permissions du propriétaire et
discussions que les autres communautés. Les compteurs reflètent leurs vrais membres.

## Provisionnement par un opérateur

Identifier d'abord le profil existant de l'administrateur, avec son accord.
Ne pas choisir automatiquement le premier utilisateur inscrit et ne pas créer
de faux compte Auth. Vérifier l'identifiant public, puis relever son UUID :

```sql
select id, username, full_name from public.profiles
where username = '<identifiant-administrateur>';
```

Avec une session SQL opérateur, exécuter dans une transaction :

```sql
begin;
select * from public.provision_official_communities('<UUID-profil-existant>'::uuid);
commit;
```

Après `202610190004_technology_catalog.sql`, la fonction retourne `(id, slug, created)`
pour les quatre communautés technologiques actives. Elle crée
uniquement les communautés absentes et l'adhésion réelle de l'administrateur en
tant que propriétaire. Une seconde exécution ne crée aucun doublon et conserve
les descriptions déjà modifiées. Si un slug du catalogue appartient à une
communauté non officielle, archivée ou à un autre propriétaire, toute l'opération échoue :
l'opérateur doit examiner la collision avant de recommencer.

La fonction ne dispose pas de `SECURITY DEFINER` et son exécution est révoquée
pour `PUBLIC`, `anon`, `authenticated` et `service_role`. Les requêtes applicatives gardent le
jeton utilisateur et les règles RLS. Un propriétaire normal ne peut pas ajouter
ou retirer lui-même le badge officiel, même via un appel direct à la Data API.

## Catalogue

React, Python, TypeScript et FastAPI.
Les catégories et tags réels alimentent les filtres et recommandations existants.
Aucune publication ni aucun membre fictif ne sont ajoutés.

La migration `202610190004_technology_catalog.sql` retire les anciennes communautés
officielles générales du catalogue en renseignant `archived_at` : Design Systems,
Open Source, IA & Data, DevOps & Cloud, Mobile Makers, Creative Coding, Game Dev et
Security Lab. Le ciblage utilise leurs huit slugs exacts et `is_official = true`.
Les communautés créées par les membres ne sont pas archivées par cette migration.
L'archivage conserve les comptes, adhésions, publications et événements existants.
Le provisionnement ne crée plus ces huit communautés et ne réactive aucune archive.

La découverte et les listes de publications/événements excluent les communautés
archivées côté serveur. Le détail normal d'une communauté archivée répond 404.
Les lectures historiques directes des publications et événements restent possibles
avec leurs règles d'accès existantes. Les nouvelles adhésions, publications,
modifications de publications/événements et inscriptions à un événement archivé
sont bloquées par PostgreSQL. Un membre peut toujours quitter une communauté
archivée ou annuler sa propre inscription.

## Unicité des noms

Le nom d'une communauté est unique sur toute la plateforme, y compris pour les
archives. L'index unique `communities_name_normalized_unique` compare
`lower(btrim(name))` : `React`, `react` et ` React ` désignent le même nom.
Cette protection s'applique aussi aux créations concurrentes et aux modifications
faites directement via la Data API. Un nom composé uniquement d'espaces est refusé.
Les noms existants ne sont ni réécrits ni fusionnés automatiquement.

Avant d'appliquer la migration, l'opérateur vérifie les collisions éventuelles :

```sql
select lower(btrim(name)) as normalized_name, count(*) as total, array_agg(id) as ids
from public.communities group by lower(btrim(name)) having count(*) > 1;
select id, name from public.communities where name !~ '[^[:space:]]';
```

Une collision doit être examinée avant l'application ; la migration échoue sans
renommer une communauté ou supprimer ses données.

## Compte officiel et accès

Le compte `@opendev` a été créé via une invitation Supabase Auth à l’adresse
fournie par l’utilisateur. Le destinataire choisit son mot de passe dans le lien
d’activation, puis complète le premier parcours de profil. Ce compte est le
propriétaire des communautés officielles actives et des anciennes archives ; aucun rôle global sur toute
la plateforme n’est accordé à partir de son nom ou de métadonnées modifiables.

`scripts/invite_official_owner.py` est un outil ponctuel réservé à l’opérateur.
Il utilise la session Supabase CLI authentifiée et garde la clé serveur en
mémoire uniquement pour l’invitation Auth. Il ne charge pas cette clé dans
l’API FastAPI ni le frontend et ne journalise ni clé ni lien d’activation.
Ne pas le relancer pour un compte déjà créé. L’adresse privée n’est pas
enregistrée dans le catalogue des communautés.

L’API de découverte expose `created_by`, `is_official` et `category` et accepte
`kind=official` ou `kind=member`. Le frontend réutilise ces valeurs pour les
badges, filtres et boutons de gestion. Les membres s’inscrivent avec leur
propre token ; le provisionnement n’inscrit que le vrai compte propriétaire.
`GET /communities/{uuid}/members?limit=100&offset=0` expose les adhésions réelles
et la projection des profils publics, triées par date d’adhésion puis UUID.
L’onglet Membres utilise cet endpoint au lieu d’inférer une appartenance à
partir des compétences ou des publications d’un profil.

Une reprise par une entreprise devra faire l’objet d’une vérification de son
identité et d’un transfert explicite de `created_by` ainsi que de l’adhésion
`owner`. Le simple fait d’être membre ou de choisir un nom d’entreprise ne
transfère aucun droit. Le provisionnement idempotent refuse de réattribuer une
communauté existante à un autre compte.

## Contrôle local

`tests/official_communities_smoke.sql` décrit le catalogue historique de douze
communautés avant `202610190004_technology_catalog.sql`. Il ne constitue pas une
validation du nouveau catalogue de quatre technologies. Ce script historique s'exécute sur une base OpenDev locale
isolée, après les migrations et avant le provisionnement d'un catalogue réel.
Il crée deux comptes de test transactionnels, vérifie la collision de slug,
l'idempotence, les permissions opérateur/propriétaire, l'impossibilité de forger
un badge officiel, la découverte anonyme et l'adhésion/le départ d'un membre.
Toutes les écritures sont annulées par `ROLLBACK`.
