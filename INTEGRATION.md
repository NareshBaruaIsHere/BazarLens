# Frontend/backend integration

Run the backend from the repository root:

```powershell
dotnet run --project BazarLens.Server --launch-profile https
```

Run the frontend in a second terminal:

```powershell
cd bazarlens.client
npm install
npm run dev
```

Open the URL printed by Vite (normally port 7864). Requests use relative `/api` paths; Vite forwards them to `https://localhost:7089`. The existing development certificate is reused when available. To use the HTTP backend instead, launch it with `--launch-profile http` and set `$env:API_PROXY_TARGET='http://localhost:5029'` before starting Vite. Both services must be running.

Configure the database connection with the `ConnectionStrings__DefaultConnection` environment variable (or a private local .NET user secret). Do not commit database credentials. A local `appsettings.json` may contain a private fallback, but that file is excluded from this commit. The generated DbContext no longer overrides configuration with a hardcoded connection string. This integration uses the existing schema; it does not reseed or reset the database.

`src/services/api.js` is the frontend service. Pages no longer import the browser-storage mock API. Legacy mock modules remain only for fixture-based regression tests. Existing browser demo accounts do not become database accounts: sign up or use an existing database account. New registrations are always regular users; an existing administrator manages roles.

| UI | API |
| --- | --- |
| Sign up, login, restore session, logout | `/api/Auth/register`, `/login`, `/session`, `/logout` |
| Profile, password | `/api/Users/{id}/profile`, `/password` |
| Admin users | `/api/Users`, `/api/Users/{id}`, `/{id}/role`, `/{id}/status` |
| Product and market catalog | `/api/Products`, `/api/Markets`, and `/{id}` |
| Submission create/edit/delete | `/api/Submission`, `/api/Submission/{id}` |
| Personal submissions | `/api/Submission/user/{id}` |
| Admin review | `/api/Submission/admin/review`, `/api/Submission/{id}/review` |
| Public prices, trends and statistics | `/api/Submission` (verified observations) |
| Overview cards | `/api/Admin/overview` |
| Alerts and preferences | `/api/Account/alerts`, `/alerts/{id}`, `/settings` |
| Activity | `/api/Account/activity` |

Location/category selectors derive their options from database catalogs already loaded by the screen, preserving parent-child relationships and real IDs. The existing `/api/Locations/...` and `/api/Products/categories/...` endpoints remain available. The adapter translates `area` to `thana`, `date` to `observedOn`, password/rejection field names and numeric form inputs. Prices/trends/notifications are calculated from current API records; the server owns submission screening and approval.

Authentication uses revocable database sessions and HTTP-only cookies. Ownership and administrator permissions are checked by the server, including blocked-account checks. Signup cannot assign an administrator role. Public price responses omit contributor details, notes and evidence. Evidence URLs are stored in the existing screening JSONB metadata, avoiding a schema migration.

Email alerts and password recovery are disabled as requested. In-app alerts are enabled. Admin JSON export contains application records without passwords or session tokens. Browser demo reset/import is intentionally unavailable for the live database; use PostgreSQL tools for backups/restores.

For deployment, serve the frontend and `/api` through the same origin. `VITE_API_BASE_URL` can override the API prefix for compatible deployments. A separate origin needs explicit credentialed CORS configuration and compatible cookie/site settings; the development proxy avoids this.

Validation:

```powershell
# Backend build, without launching the frontend project
dotnet build BazarLens.Server/BazarLens.Server.csproj -p:BuildProjectReferences=false
# From bazarlens.client
npm run build
npm run lint
npm test
```

The frontend suite includes API transport/payload tests plus legacy fixture and rendered-page regressions. The rendered-page suite injects test fixtures, not the live database.

Optional live integration checks (from repository root, backend running at HTTP port 5029):

```powershell
dotnet run --project tests/ApiIntegration -p:BuildProjectReferences=false
```

These require database network access. They create uniquely named temporary accounts/catalog records, exercise authorization and CRUD, and remove their own records in a `finally` block. `API_TEST_URL` overrides the server URL; `ConnectionStrings__DefaultConnection` supplies the fixture connection. Never point the fixture connection and API at different databases.

Verification completed: backend and integration-test builds passed without warnings; frontend build and lint passed; API adapter tests and 34 populated-page fixture render checks passed; 25 live PostgreSQL/API assertions passed through Vite at port 7864. Temporary integration records were removed. Full browser interaction/visual automation was not run.
