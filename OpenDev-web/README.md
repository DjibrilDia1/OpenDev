# OpenDev Web

Interface React, TypeScript et Tailwind CSS.

## CI/CD GitHub Actions

Le workflow dédié [web-ci.yml](../.github/workflows/web-ci.yml) se lance sur les push et les pull requests qui modifient `OpenDev-web`, ainsi que sur déclenchement manuel.

Il installe les dépendances avec `npm ci`, vérifie ESLint, compile TypeScript et construit React. Le dossier `dist` est disponible comme artifact pendant 14 jours.

Les variables Supabase et l'URL de l'API sont documentées dans [docs/ci-cd.md](../docs/ci-cd.md). Le déploiement sur Systalink sera ajouté lorsque les services d'hébergement seront configurés.

## Démarrage local

```powershell
npm ci
npm run dev
```

Configurer `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` et `VITE_API_URL` dans `.env` avant le lancement. La clé Supabase utilisée dans le navigateur doit être publique.
