# OpenDev API

API métier FastAPI. Supabase gère les identités, la base de données et les politiques RLS. Les routes protégées valident les jetons d’accès Supabase.

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

Documentation : `http://127.0.0.1:8000/docs`.

Configure `SUPABASE_JWT_SECRET` pour activer les routes protégées. Le vérificateur initial prend en charge les jetons HS256. Si le projet Supabase utilise des clés asymétriques, configure la vérification JWKS avant la mise en production.
