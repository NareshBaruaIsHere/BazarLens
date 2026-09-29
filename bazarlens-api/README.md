# BazarLens API

FastAPI service for Neon PostgreSQL. The API never creates tables at startup;
apply the schema explicitly before deploying.

## Neon

1. Open the Neon project used by this app and choose its SQL Editor.
2. For a fresh database, run neon_schema.sql.
3. If the earlier schema has already been applied, run
   migrations/0002_user_thana_and_submission_quality.sql. It copies existing
   users.area values into users.thana, drops the old profile column, and adds
   submissions.quality. Migration 0001 adds auth_sessions for earlier schemas.
4. Copy the Neon pooled connection string. Keep it private.

## Render API service

This repository includes a render.yaml Blueprint. Create or update the service
from that Blueprint, or configure a Python web service with:

- Root directory: bazarlens-api
- Build command: pip install -r requirements.txt
- Start command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
- Health check path: /health

Set these environment variables in Render:

- DATABASE_URL: Neon pooled PostgreSQL URL (include sslmode=require).
- FRONTEND_ORIGIN: exact deployed frontend origin, such as
  https://bazarlens.onrender.com; no trailing slash. Multiple origins may be
  comma-separated.
- COOKIE_SECURE=true
- CHECK_DATABASE_ON_STARTUP=true

After the API deploys, create the first admin from Render's Shell using
python -m app.bootstrap_admin. The command prompts for the password and is
disabled once an admin account exists. Do not create an admin by inserting a
plaintext password into SQL.

## Local API

Copy .env.example to .env, fill in a development DATABASE_URL, set
FRONTEND_ORIGIN=http://localhost:5173 and COOKIE_SECURE=false, then run:

~~~sh
python -m venv .venv
pip install -r requirements.txt
uvicorn app.main:app --reload
~~~

The interactive API reference is at /docs. The database connection check is
at /health.

## Current endpoint coverage

Implemented routes cover account signup/login/logout/session/profile/password
change, admin user management, products, markets, submission CRUD and review,
agent screening, current prices, public statistics, trends, alerts, settings,
notifications, summary, analytics and database counts.

Password reset email delivery, database backup/import/reset, stored notification
read state, and email alert delivery need additional product decisions or an
email/storage provider. The corresponding password recovery endpoint currently
returns a generic response and does not send email. The frontend on the
feature/shakib/Database-api branch is not present, so API wiring in the
frontend still needs to be merged from its frontend branch and pointed at
VITE_API_BASE_URL=https://<api-service>.onrender.com/api with mock mode off.
