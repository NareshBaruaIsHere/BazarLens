# Running BazerLens locally

## What works now

The React frontend implements users, agents, admins, prices, submissions, automatic agent screening, flagged reviews, alerts and public statistics using browser-local mock data. The ASP.NET Core project builds and starts, but it has **no BazerLens API endpoints, authentication service or PostgreSQL connection yet**. Running both processes does not turn the mock frontend into a database-backed application. Backend implementation is specified in FRONTEND_HANDOFF.md.

Prerequisites: Node.js compatible with Vite 8 (this workspace was tested with Node 24), npm, and .NET 10 SDK for the server. No PostgreSQL installation is needed for this demo. Use `npm.cmd` in Windows PowerShell to avoid execution-policy errors from npm.ps1.

## Start the frontend — PowerShell terminal 1

```powershell
cd D:\My_Projects\BazerLens\bazarlens.client
npm.cmd install
npm.cmd run dev
```

Open the exact **Local** URL printed by Vite, normally `https://localhost:7864` when the existing Visual Studio development certificate is present, otherwise `http://localhost:7864`. Keep this terminal open. If another process owns 7864, use the URL Vite actually prints or stop the previous dev server.

Use `/statistics` for public prices and `/login` for accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@bazarlens.com | Admin@123 |
| User | user@bazarlens.com | User@123 |
| Agent | agent@bazarlens.com | Agent@123 |

The Agent demo account exists on new/reset databases. If you already used the earlier version, your data is preserved: sign in as admin, open **Users**, then add an agent or edit an existing account and select **agent**. You do not need to reset your database. Admin Settings offers export and a destructive confirmed reset if you deliberately want fresh seed data.

To try screening, use an agent to submit Rice at Town Hall Bazar on today's date, around ৳66/kg on a fresh seed. This should pass the median check. A price of ৳200/kg is unusual and stays pending/flagged; inspect it under Admin → Submissions → Screening → Flagged for review. The exact baseline is shown in submission details. General-user contributions remain pending for manual review.

## Start the existing server — PowerShell terminal 2

From the repository root:

```powershell
cd D:\My_Projects\BazerLens
dotnet restore BazarLens.Server\BazarLens.Server.csproj
dotnet build BazarLens.Server\BazarLens.Server.csproj --no-restore -p:BuildProjectReferences=false
dotnet run --project BazarLens.Server\BazarLens.Server.csproj --no-build --no-launch-profile -- --urls http://localhost:5029 --environment Development --Logging:EventLog:LogLevel:Default None
```

This starts the server separately from Vite, avoids a second SPA-proxy launch, and disables Windows Event Log output for this process because restricted environments may deny Event Log writes. Console logging remains enabled. The build flag skips rebuilding the already-running frontend project reference; it does not disable any backend application feature.

Expected output: `Now listening on: http://localhost:5029`.

Check `http://localhost:5029/openapi/v1.json`: it returns the scaffold's OpenAPI JSON. Its `paths` object is currently empty because there are no implemented controllers. Open the frontend at Vite's URL, not at the backend root. A missing-wwwroot warning is expected for this separate-development-server arrangement. HTTP here is for a local mock demo; use HTTPS before integrating real account credentials.

The above build and startup were verified in this workspace, including HTTP 200 from the OpenAPI URL. Package restore is needed when setting up a fresh checkout.

## Existing Visual Studio / HTTPS launch option

The solution already contains a multi-project profile for the client and server. Open `BazarLens.slnx` in a Visual Studio version supporting .NET 10, install frontend dependencies, select that profile, and run. The server `https` launch profile uses `https://localhost:7089` and expects the SPA at `https://localhost:7864`. Keep the client certificate and scheme consistent with that expectation. If certificates are missing, use the explicit two-terminal instructions above or configure/trust development certificates through the normal .NET/OS workflow. Do not bypass browser certificate warnings.

## Verify changes

```powershell
cd D:\My_Projects\BazerLens\bazarlens.client
npm.cmd run lint
npm.cmd run build
node tests\mockApi.test.mjs
node tests\priceScreening.test.mjs
node tests\render.test.mjs
```

To stop either running process, press Ctrl+C in its terminal. Browser data persists under the same frontend origin; changing scheme/host/port uses a different browser-storage origin. Export before moving between origins if you need to retain your demo data.

## Connecting the real backend later

Follow FRONTEND_HANDOFF.md, including the Agent/screening/public-response additions in section 19. Implement PostgreSQL and the API first, then replace the mock service with a fetch adapter. `.env.example` documents intended integration variables; changing `VITE_USE_MOCK_API` by itself does not implement or connect an API. All current data and passwords remain in this browser only.
