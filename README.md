# OpenDev

La pipeline GitHub Actions et sa configuration sont décrites dans [docs/ci-cd.md](docs/ci-cd.md).

OpenDev est une communauté de développeurs pour discuter, apprendre, partager, découvrir et construire ensemble.

## Architecture

- `OpenDev-web` : interface React, TypeScript et Tailwind CSS.
- `OpenDev-api` : API métier FastAPI.
- Supabase : authentification, PostgreSQL et politiques d'accès (RLS).

Le client Supabase du navigateur gère les sessions et les opérations autorisées par RLS. FastAPI porte la logique métier et vérifie les jetons Supabase pour ses routes protégées. Ne jamais exposer la clé `service_role` dans le frontend.

## Prérequis

Node.js 20.19+ ou 22.12+, npm et Python 3.12+.

## Frontend

```powershell
cd OpenDev-web
npm install
Copy-Item .env.example .env.local
npm run dev
```

Configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` et éventuellement `VITE_API_URL` dans `.env.local`.

## API

```powershell
cd OpenDev-api
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

Documentation interactive : `http://127.0.0.1:8000/docs`.
