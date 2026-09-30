# BazerLens frontend

React 19, Vite 8, JavaScript/JSX, React Router and inline SVG charts, connected to the ASP.NET Core API and PostgreSQL.

Run the backend from the repository root:

```powershell
dotnet run --project BazarLens.Server --launch-profile https
```

Then, from this directory:

```sh
npm install
npm run dev
```

Open the URL printed by Vite on port 7864. Existing development certificates are reused when available; otherwise Vite uses local HTTP. `/api` requests are proxied to `https://localhost:7089`. Set `API_PROXY_TARGET` before starting Vite to use another backend address. On Windows with PowerShell script execution disabled, use `npm.cmd`.

Sign up or use an existing database account. Browser demo accounts and localStorage records are no longer used by the app. New accounts have the user role; administrators manage agents and other users.

Public statistics are at `/statistics`. Submissions, reviews, catalogs, profiles, settings, alerts and dashboards use `src/services/api.js`. In-app notifications work; email delivery and password recovery are currently disabled. Admin settings can export records, while database backup/restore belongs in PostgreSQL tooling.

```sh
npm run build
npm run lint
npm test
```

Tests include HTTP adapter contracts and fixture-based regression/render tests. The legacy mock service is retained only as a test fixture. See [INTEGRATION.md](../INTEGRATION.md) for API mappings, database configuration, deployment notes and opt-in live integration tests. Earlier frontend planning/handoff documents describe the original prototype.
