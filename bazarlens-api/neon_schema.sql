-- BazarLens database schema for Neon PostgreSQL.
-- Safe to re-run. This matches app/models.py and app/main.py.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
    email text NOT NULL CHECK (email = lower(email)),
    password_hash text NOT NULL,
    role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin','agent','user')),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','blocked')),
    city text NOT NULL,
    area text NOT NULL,
    avatar_url text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (lower(email));

CREATE TABLE IF NOT EXISTS products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    category text NOT NULL,
    unit text NOT NULL CHECK (length(btrim(unit)) BETWEEN 1 AND 20),
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS products_name_unique ON products (lower(name));

CREATE TABLE IF NOT EXISTS markets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    area text NOT NULL,
    district text NOT NULL,
    division text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT markets_name_area_unique UNIQUE (name, area)
);
CREATE INDEX IF NOT EXISTS markets_area_idx ON markets (area);

CREATE TABLE IF NOT EXISTS submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    market_id uuid NOT NULL REFERENCES markets(id) ON DELETE RESTRICT,
    unit text NOT NULL,
    price numeric(12,2) NOT NULL CHECK (price > 0),
    observed_on date NOT NULL,
    note text NOT NULL DEFAULT '' CHECK (length(note) <= 1000),
    evidence_url text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
    rejection_reason text NOT NULL DEFAULT '',
    flagged boolean NOT NULL DEFAULT false,
    screening jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT submissions_rejection_reason CHECK (status <> 'rejected' OR length(btrim(rejection_reason)) > 0)
);
CREATE INDEX IF NOT EXISTS submissions_prices_idx ON submissions (product_id, market_id, unit, observed_on DESC) WHERE status = 'verified';
CREATE INDEX IF NOT EXISTS submissions_user_idx ON submissions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS submissions_pending_idx ON submissions (created_at DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS submissions_flagged_idx ON submissions (created_at DESC) WHERE status = 'pending' AND flagged;

CREATE TABLE IF NOT EXISTS submission_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE RESTRICT,
    status text NOT NULL CHECK (status IN ('verified','rejected')),
    reviewer_id uuid REFERENCES users(id) ON DELETE RESTRICT,
    source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','automatic')),
    reason text NOT NULL DEFAULT '' CHECK (length(reason) <= 1000),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT automatic_review_shape CHECK (source <> 'automatic' OR (reviewer_id IS NULL AND status = 'verified'))
);
CREATE INDEX IF NOT EXISTS submission_reviews_submission_idx ON submission_reviews (submission_id, created_at);

CREATE TABLE IF NOT EXISTS price_alerts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    area text NOT NULL DEFAULT '',
    direction text NOT NULL CHECK (direction IN ('above','below')),
    target_price numeric(12,2) NOT NULL CHECK (target_price > 0),
    enabled boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS price_alerts_user_idx ON price_alerts (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_settings (
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    default_area text NOT NULL DEFAULT '',
    email_alerts boolean NOT NULL DEFAULT false,
    in_app_notifications boolean NOT NULL DEFAULT true,
    compact_tables boolean NOT NULL DEFAULT false,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    message text NOT NULL CHECK (length(btrim(message)) BETWEEN 1 AND 1000),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_user_idx ON activity (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS auth_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash varchar(64) NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT auth_sessions_expiry_valid CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions(expires_at);

CREATE OR REPLACE VIEW public_current_prices AS
WITH latest_day AS (
    SELECT product_id, market_id, unit, max(observed_on) AS observed_on
    FROM submissions WHERE status = 'verified'
    GROUP BY product_id, market_id, unit
)
SELECT p.id AS product_id, p.name AS product, p.category,
       m.id AS market_id, m.name AS market, m.area, s.unit, s.observed_on AS date,
       avg(s.price)::numeric(12,2) AS average,
       min(s.price)::numeric(12,2) AS lowest, max(s.price)::numeric(12,2) AS highest
FROM latest_day d
JOIN submissions s ON (s.product_id, s.market_id, s.unit, s.observed_on) =
                         (d.product_id, d.market_id, d.unit, d.observed_on)
JOIN products p ON p.id = s.product_id
JOIN markets m ON m.id = s.market_id
WHERE s.status = 'verified'
GROUP BY p.id, p.name, p.category, m.id, m.name, m.area, s.unit, s.observed_on;

INSERT INTO products (name, category, unit) VALUES
('Rice','Grains','kg'), ('Potato','Vegetables','kg'), ('Onion','Vegetables','kg'),
('Tomato','Vegetables','kg'), ('Egg','Protein','dozen'), ('Chicken','Meat','kg'),
('Beef','Meat','kg'), ('Hilsa','Fish','kg')
ON CONFLICT DO NOTHING;

INSERT INTO markets (name, area, district, division) VALUES
('Karwan Bazar','Tejgaon','Dhaka','Dhaka'),
('Town Hall Bazar','Dhanmondi','Dhaka','Dhaka'),
('Reazuddin Bazar','Kotwali','Chattogram','Chattogram'),
('Zindabazar','Zindabazar','Sylhet','Sylhet'),
('New Market','Boalia','Rajshahi','Rajshahi'),
('Boro Bazar','Khulna Sadar','Khulna','Khulna'),
('Port Road Bazar','Barishal Sadar','Barishal','Barishal')
ON CONFLICT (name, area) DO NOTHING;
COMMIT;
