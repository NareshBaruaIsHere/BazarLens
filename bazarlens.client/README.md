# BazerLens frontend

React 19, Vite 8, JavaScript/JSX, plain CSS, React Router and inline SVG charts.

```sh
npm install
npm run dev
npm run lint
npm run build
node tests/mockApi.test.mjs
node tests/render.test.mjs
node tests/priceScreening.test.mjs
```

On Windows PowerShell with script execution disabled, use `npm.cmd`.
The dev server uses port 7864 and existing ASP.NET development certificates when available; otherwise it uses local HTTP. The ASP.NET server is not needed for the mock frontend.

Demo admin: `admin@bazarlens.com` / `Admin@123`.
Demo agent (fresh/reset database): `agent@bazarlens.com` / `Agent@123`. Existing databases: assign Agent under Admin Users without resetting data.
Demo user: `user@bazarlens.com` / `User@123`.

All data persists in this browser under `bazerlens_mock_db_v1`. These are **demo passwords stored as plaintext**, never production authentication. Email and OAuth are not connected. Admin Settings provides JSON export/import and a confirmed reset.

See `../FRONTEND_PLAN.md` and `../FRONTEND_HANDOFF.md` for the implementation plan, routes, service/API contract, backend integration order and verification record.

Public price statistics are available at `/statistics` without signing in. Agents receive automatic approval for normal screened prices; unusual or insufficient-baseline reports go to admin review.

For running both the frontend and the ASP.NET scaffold, see `../RUNNING.md`. The server currently contains no BazerLens API endpoints or PostgreSQL integration.
