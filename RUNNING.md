# Running BazerLens locally

The frontend now uses the ASP.NET Core API and configured PostgreSQL database. Both frontend and backend must run. Requires .NET 10 and a Node.js version compatible with Vite 8.

From the repository root, terminal 1:

```powershell
dotnet run --project BazarLens.Server --launch-profile https
```

Terminal 2:

```powershell
cd bazarlens.client
npm.cmd install
npm.cmd run dev
```

Open the Local URL printed by Vite, normally port 7864. `/statistics` is public; `/signup` creates a database user account. Sign in with an existing database account for admin/agent access. Previous browser demo credentials are not automatically database accounts.

The default proxy sends `/api` to `https://localhost:7089`. For HTTP development, use `--launch-profile http` in terminal 1 and set `$env:API_PROXY_TARGET='http://localhost:5029'` before starting Vite in terminal 2. This also avoids local development certificate issues.

Configure `ConnectionStrings:DefaultConnection` on the server, or override it with the `ConnectionStrings__DefaultConnection` environment variable. No automatic database reset or seeding occurs. Existing schema and records are retained.

See [INTEGRATION.md](INTEGRATION.md) for endpoint mappings, tests and deployment notes. Email delivery/password recovery are disabled for now; in-app alerts use database records. Backup and restore are managed with PostgreSQL tools.
