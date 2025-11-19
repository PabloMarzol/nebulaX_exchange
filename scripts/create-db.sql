-- NebulaX Exchange Database Setup
-- Run this script as the postgres superuser to create the database

-- Drop database if exists (uncomment if needed)
-- DROP DATABASE IF EXISTS nebulax_exchange_db;

-- Create database
CREATE DATABASE nebulax_exchange_db
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1
    IS_TEMPLATE = False;

-- Connect to the new database
\c nebulax_exchange_db

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE nebulax_exchange_db TO postgres;

-- Success message
\echo 'Database nebulax_exchange_db created successfully!'
\echo 'You can now run migrations with: pnpm run migrate'
