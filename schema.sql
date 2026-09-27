-- ============================================
-- BazarLens Database Schema
-- Run this in Neon's SQL Editor to create all tables.
-- This file is version-controlled documentation of the schema
-- (even though the tables already exist in Neon).
-- ============================================

-- 1. Enum types
CREATE TYPE user_role AS ENUM ('user', 'agent', 'admin');
CREATE TYPE price_quality AS ENUM ('Good', 'Moderate', 'Poor');
CREATE TYPE price_status AS ENUM ('pending', 'approved', 'flagged', 'rejected');

-- 2. Locations — fixed city/thana list, pre-seeded (not user-typed)
CREATE TABLE location (
    id SERIAL PRIMARY KEY,
    city VARCHAR NOT NULL,
    thana VARCHAR NOT NULL,
    UNIQUE (city, thana)
);

-- 3. Users — General User, Agent, Admin all share this table
CREATE TABLE "user" (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR NOT NULL,
    email VARCHAR UNIQUE,              -- login for User/Agent
    username VARCHAR UNIQUE,           -- login for Admin only
    phone VARCHAR,
    password_hash VARCHAR NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    city_id INTEGER REFERENCES location(id),
    thana_id INTEGER REFERENCES location(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 4. Categories
CREATE TABLE category (
    id SERIAL PRIMARY KEY,
    name VARCHAR UNIQUE NOT NULL
);

-- 5. Products
CREATE TABLE product (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    category_id INTEGER REFERENCES category(id)
);

-- 6. Price submissions — the core table
CREATE TABLE pricesubmission (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES product(id),
    location_id INTEGER NOT NULL REFERENCES location(id),
    submitted_by INTEGER NOT NULL REFERENCES "user"(id),
    quantity NUMERIC(6,2) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    quality price_quality NOT NULL,
    status price_status NOT NULL DEFAULT 'pending',
    reviewed_by INTEGER REFERENCES "user"(id),
    review_note TEXT,
    submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP
);

-- ============================================
-- Seed data — fixed dropdown options
-- ============================================

INSERT INTO location (city, thana) VALUES
('Chattogram', 'Bahaddarhat'),
('Chattogram', 'Chawkbajar'),
('Dhaka', 'Dhanmondi'),
('Dhaka', 'Mirpur');

INSERT INTO category (name) VALUES
('Rice'), ('Vegetables'), ('Fish'), ('Meat');
