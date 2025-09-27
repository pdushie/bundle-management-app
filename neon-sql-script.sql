-- Bundle Management App Complete Database Setup and Migration Script
-- Run this script in the Neon SQL Editor to set up or update your database schema

-- Using integer data type for user IDs
-- The users table has an integer id column

-- Note: Users, history_entries, and phone_entries tables already exist, preserving existing structure
-- This script will only add missing tables and columns

-- Create orders table if not exists - with correct integer type for foreign keys
DROP TABLE IF EXISTS "orders" CASCADE;
CREATE TABLE IF NOT EXISTS "orders" (
  "id" varchar PRIMARY KEY NOT NULL,
  "timestamp" bigint NOT NULL,
  "date" varchar(10) NOT NULL,
  "time" varchar(10) NOT NULL,
  "user_name" varchar(100) NOT NULL,
  "user_email" varchar(100) NOT NULL,
  "total_data" decimal(10,2) NOT NULL,
  "total_count" integer NOT NULL,
  "status" varchar(20) NOT NULL,
  "user_id" integer REFERENCES "users" ("id") ON DELETE SET NULL,
  "processed_by" integer REFERENCES "users" ("id") ON DELETE SET NULL,
  "processed_at" timestamp,
  "created_at" timestamp DEFAULT now()
);

-- Create order_entries table if not exists
DROP TABLE IF EXISTS "order_entries" CASCADE;
CREATE TABLE IF NOT EXISTS "order_entries" (
  "id" serial PRIMARY KEY,
  "order_id" varchar NOT NULL REFERENCES "orders" ("id") ON DELETE CASCADE,
  "number" varchar(15) NOT NULL,
  "allocation_gb" decimal(10,2) NOT NULL,
  "status" varchar(20),
  "comment" text,
  "created_at" timestamp DEFAULT now()
);

-- Note: history_entries table already exists, preserving existing structure

-- Note: phone_entries table already exists, preserving existing structure

-- Create sessions table if not exists
CREATE TABLE IF NOT EXISTS "sessions" (
  "session_token" varchar PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "expires" timestamp NOT NULL
);

-- Add missing columns to tables if they don't exist
DO $$
BEGIN
    -- Add processed_by column to orders if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'processed_by'
    ) THEN
        ALTER TABLE "orders" ADD COLUMN "processed_by" integer REFERENCES "users" ("id") ON DELETE SET NULL;
    END IF;
    
    -- Add processed_at column to orders if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'processed_at'
    ) THEN
        ALTER TABLE "orders" ADD COLUMN "processed_at" timestamp;
    END IF;
    
    -- Add comment column to order_entries if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_entries' AND column_name = 'comment'
    ) THEN
        ALTER TABLE "order_entries" ADD COLUMN "comment" text;
    END IF;
END $$;

-- Create missing indices for better performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_entries_order_id ON order_entries(order_id);

-- Verify schema after changes
DO $$
DECLARE
    missing_tables TEXT := '';
    missing_columns TEXT := '';
BEGIN
    -- Check for missing tables (excluding users since it already exists)
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'orders') THEN
        missing_tables := missing_tables || 'orders, ';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'order_entries') THEN
        missing_tables := missing_tables || 'order_entries, ';
    END IF;
    
    -- Skipping history_entries check as it already exists
    
    -- Skipping phone_entries check as it already exists
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'sessions') THEN
        missing_tables := missing_tables || 'sessions, ';
    END IF;
    
    -- Check for key columns
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'processed_by'
    ) INTO STRICT missing_columns;
    
    IF NOT missing_columns THEN
        missing_columns := 'orders.processed_by, ';
    END IF;
    
    -- Output results
    IF LENGTH(missing_tables) > 0 THEN
        RAISE NOTICE 'Missing tables after script execution: %', LEFT(missing_tables, LENGTH(missing_tables) - 2);
    END IF;
    
    IF LENGTH(missing_columns) > 0 THEN
        RAISE NOTICE 'Missing columns after script execution: %', LEFT(missing_columns, LENGTH(missing_columns) - 2);
    END IF;
    
    IF LENGTH(missing_tables) = 0 AND LENGTH(missing_columns) = 0 THEN
        RAISE NOTICE 'Database schema setup completed successfully!';
    END IF;
END $$;
