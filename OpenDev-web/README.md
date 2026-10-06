# OpenDev Web

Le [Dockerfile](Dockerfile) propose une cible `development` avec Vite et une cible `production` avec Nginx. Depuis la racine du dépôt : `docker compose up -d --build --wait`. Voir [les instructions Docker](../README.md#docker--développement).

Interface React, TypeScript et Tailwind CSS.

## CI/CD GitHub Actions

Le workflow dédié [web-ci.yml](../.github/workflows/web-ci.yml) se lance sur les push et les pull requests qui modifient `OpenDev-web`, ainsi que sur déclenchement manuel.

Il installe les dépendances avec `npm ci`, vérifie ESLint, compile TypeScript et construit React. Le dossier `dist` est disponible comme artifact pendant 14 jours.

Le build natif lit les variables GitHub `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` et `VITE_API_URL`. Le build Docker utilise `/api/v1` avec un proxy vers FastAPI. La CI construit et vérifie les deux images Docker. Le déploiement sur Systalink sera ajouté lorsque les services d'hébergement seront configurés.

## Démarrage local

```powershell
npm ci
npm run dev
```

Configurer `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` et `VITE_API_URL` dans `.env` avant le lancement. La clé Supabase utilisée dans le navigateur doit être publique.
