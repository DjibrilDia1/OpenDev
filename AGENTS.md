# OpenDev development instructions

## Project architecture

- `OpenDev-web`: React 19, TypeScript, Vite and Tailwind CSS. Preserve the chosen monochrome design and existing UI conventions.
- `OpenDev-api`: FastAPI with Pydantic schemas, routes, services and repositories. The current persistence layer uses Supabase Data API through HTTPX.
- Supabase owns authentication and data access through RLS. Preserve the caller's access token on database requests. Never introduce a service-role key into the frontend or bypass RLS for normal application operations.
- Database changes belong in versioned SQL migrations under `OpenDev-api/supabase/migrations`.
- Dependencies are locked in `OpenDev-api/uv.lock` and `OpenDev-web/package-lock.json`. Keep these files consistent with their package definitions.
- Docker supports development and production targets. GitHub Actions has separate Web and API workflows.

## Installed project skills

Skills are installed in `.agents/skills`. Read the relevant `SKILL.md` before applying a skill and resolve its supporting files relative to its installed directory. Use only skills relevant to the current request; do not load the entire collection.

| Task | Skill directories |
| --- | --- |
| React components, performance and composition | `react-best-practices`, `composition-patterns` |
| TypeScript types | `typescript-advanced-types` |
| UI design and accessibility | `frontend-design`, `web-design-guidelines` |
| FastAPI routes, validation and dependencies | `fastapi` |
| Supabase/PostgreSQL, migrations, indexes and RLS | `supabase-postgres-best-practices` |
| Dockerfiles and Compose | `docker-build-strategies`, `docker-compose-patterns` |
| Python tests | `python-testing-patterns` |
| Browser checks and application testing | `playwright`, `webapp-testing` |
| Code reviews and PR feedback | `code-review-excellence`, `gh-address-comments` |
| GitHub Actions failures | `gh-fix-ci` |
| Explicit security reviews and threat analysis | `security-best-practices`, `security-threat-model`, `security-ownership-map` |

Generic skill examples do not override project architecture or user instructions. React/Next.js guidance must be adapted to Vite; do not migrate to Next.js. FastAPI examples must preserve Supabase Auth and RLS rather than introducing a separate authentication system or ORM by default. Check library features against the project's locked versions before using them.

Figma skills are provided by the installed Figma plugin when available. Use those existing capabilities for Figma work.

## Multi-agent orchestration

OpenDev uses specialized development agents coordinated by a Tech Lead / Orchestrator.

The user should normally be able to describe a goal without manually selecting an agent. For each request, first determine which specialist domains are involved and apply the instructions from the corresponding agent definitions under `.agents/`.

### Available agents

| Domain | Agent instructions |
| --- | --- |
| Technical architecture and task coordination | `.agents/tech-lead/AGENT.md` |
| React/Vite frontend development | `.agents/frontend/AGENT.md` |
| FastAPI backend development | `.agents/backend/AGENT.md` |
| UI/UX and design system | `.agents/ui-ux/AGENT.md` |
| Supabase/PostgreSQL/database architecture | `.agents/database/AGENT.md` |
| Authentication, RLS and application security | `.agents/security/AGENT.md` |
| Testing and quality assurance | `.agents/qa/AGENT.md` |
| Docker, CI/CD and deployment | `.agents/devops/AGENT.md` |

### Request routing

For every development request:

1. Understand the user's objective before editing code.
2. Determine which domains are affected.
3. Read only the relevant agent instructions.
4. Read the relevant installed `SKILL.md` files when specialized guidance is needed.
5. Build a task breakdown when the request spans multiple domains.
6. Execute the work while respecting the boundaries of each specialist.
7. Validate the resulting integration across affected domains.
8. Run the appropriate tests and checks.
9. Report what was changed, validated, and any remaining risks.

Do not require the user to manually select agents unless the user explicitly wants to restrict the work to a particular domain.

### Tech Lead / Orchestrator

For requests involving multiple domains, the Tech Lead is responsible for coordinating the work.

Example:

User request:
"Add the ability for users to join communities."

Possible routing:

Database Agent
→ membership schema, constraints and RLS

Backend Agent
→ membership API/service/repository logic

Security Agent
→ authorization and RLS review

Frontend Agent
→ join/leave actions and application state

UI/UX Agent
→ interaction states and feedback

QA Agent
→ integration and regression testing

The exact agents used must be determined from the actual request. Do not invoke specialists unnecessarily.

### Agent boundaries

Agents must respect ownership boundaries.

- Frontend must not redesign backend architecture merely to simplify UI implementation.
- Backend must not bypass Supabase RLS.
- Database changes must use versioned migrations.
- UI/UX must preserve OpenDev's existing monochrome design language unless the user explicitly requests a redesign.
- Security must review changes involving authentication, authorization, RLS, secrets, file uploads, user-generated content or sensitive operations.
- DevOps must not deploy or modify production infrastructure unless explicitly requested.
- QA should validate cross-domain features after implementation.

When a change crosses a boundary, coordinate with the corresponding specialist rather than silently making unrelated architectural decisions.

### Direct agent requests

The user may explicitly restrict a request to a specialist.

Examples:

"Frontend Agent: fix the community sidebar responsiveness without changing the API."

"Security Agent: review the current authentication flow without modifying code."

"Database Agent: analyze the community schema and propose improvements."

When the user explicitly selects an agent or limits the scope, respect that boundary unless doing so would create an unsafe or broken implementation. In that case, explain the dependency before expanding the scope.

### Shared project context

Before working, read `.agents/shared/project-context.md`,
`.agents/shared/architecture.md`, `.agents/shared/coding-standards.md` and
`.agents/shared/workflow.md`. The shared workflow provides the common task and
handoff formats; specialist guides define domain responsibilities.

All agents must follow the global project architecture and rules defined in this `AGENTS.md`.

Specialized agent instructions extend these rules; they do not override them.

Priority order:

1. Explicit user instructions
2. Root `AGENTS.md`
3. Relevant specialist `AGENT.md`
4. Relevant installed `SKILL.md`
5. Generic framework conventions

If instructions conflict, follow the highest-priority applicable instruction and preserve the existing OpenDev architecture.

### Cross-agent workflow

For substantial multi-domain features, use this conceptual workflow:

USER REQUEST
→ TECH LEAD ANALYSIS
→ DOMAIN ROUTING
→ SPECIALIST IMPLEMENTATION
→ INTEGRATION REVIEW
→ QA
→ SECURITY REVIEW WHEN REQUIRED
→ FINAL VALIDATION

The goal is to behave like a coordinated engineering team while presenting one coherent result to the user.

## Validation and Git

Run checks appropriate to the requested change. Useful existing commands are `docker compose exec api python -m pytest -q`, `docker compose exec api ruff check app tests`, `docker compose exec web npm run lint`, and `npm run build` in `OpenDev-web`.

Inspect the active branch and working tree before editing. Preserve unrelated user changes. Follow the repository's PR and CODEOWNERS rules for changes targeting `main`. Keep `.env` files and credentials excluded from commits and logs.

See `.agents/README.md` and `.agents/skills-manifest.json` for the installed skills, upstream sources, pinned commits and file checksums. Installing a skill does not install its external tools or grant access to external services.
