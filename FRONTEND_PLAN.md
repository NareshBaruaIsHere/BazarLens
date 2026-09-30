# BazerLens frontend implementation plan

Scope: complete the existing React frontend, retain its green branding, dark sidebar and lightweight charts. Do not modify the ASP.NET server.

1. Read the existing frontend; install only react-router-dom.
2. Implement versioned local storage, deterministic seed records, async service validation and authorization, session restoration, authentication and toast contexts.
3. Replace state navigation with protected public/user/admin routes and accessible responsive layouts.
4. Complete prices, trends, submissions, alerts, analytics, profile and preferences.
5. Complete admin users, reviews, products, markets, analytics and validated import/export/reset.
6. Document matching HTTP contracts, data relationships, production authentication and deployment in FRONTEND_HANDOFF.md.
7. Run lint/build and service/browser verification; record results and limitations in FRONTEND_HANDOFF.md.

Verification focuses on persistence, account and role boundaries, destructive-action safeguards, referential integrity, review propagation, every route, keyboard dialogs and mobile navigation.

## Completion record

Implementation steps 1–6 completed. Lint and production build pass. Verification includes 57 service assertions and 27 populated component/layout renders without React warnings. No backend files changed. Interactive browser/mobile checks could not run because the connected browser tool reported no available browser; the handoff records those remaining manual checks explicitly.

## README.txt follow-up

Added Agent role assignment/management, deterministic agent price screening and automatic normal-price approval, flagged review metadata/filtering/analytics, anonymous public statistics and location-derived signup defaults. Existing stored data is preserved. Updated service contracts and added RUNNING.md for the current frontend plus server scaffold. Verification: 75 service assertions, 14 screening assertions and 29 render checks; frontend lint/build and server build/startup verified.
