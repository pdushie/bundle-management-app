-- Create the tables
CREATE TABLE IF NOT EXISTS "users" (
  "id" varchar PRIMARY KEY NOT NULL,
  "name" varchar NOT NULL,
  "email" varchar NOT NULL UNIQUE,
  "hashed_password" varchar NOT NULL,
  "role" varchar NOT NULL DEFAULT 'user',
  "status" varchar NOT NULL DEFAULT 'pending',
  "request_message" text,
  "approved_by" varchar,
  "approved_at" timestamp,
  "rejected_by" varchar,
  "rejected_at" timestamp,
  "rejection_reason" text,
  "created_at" timestamp DEFAULT now()
);

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
  "user_id" varchar REFERENCES "users" ("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "order_entries" (
  "id" serial PRIMARY KEY,
  "order_id" varchar NOT NULL REFERENCES "orders" ("id") ON DELETE CASCADE,
  "number" varchar(15) NOT NULL,
  "allocation_gb" decimal(10,2) NOT NULL,
  "status" varchar(20),
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "history_entries" (
  "id" varchar PRIMARY KEY,
  "date" date NOT NULL,
  "timestamp" bigint NOT NULL,
  "total_gb" decimal(10,2),
  "valid_count" integer NOT NULL,
  "invalid_count" integer NOT NULL,
  "duplicate_count" integer NOT NULL,
  "type" varchar(50) NOT NULL,
  "user_id" varchar REFERENCES "users" ("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "phone_entries" (
  "id" serial PRIMARY KEY,
  "history_entry_id" varchar REFERENCES "history_entries" ("id") ON DELETE CASCADE,
  "number" varchar(15) NOT NULL,
  "allocation_gb" decimal(10,2),
  "is_valid" boolean NOT NULL,
  "is_duplicate" boolean NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "session_token" varchar PRIMARY KEY NOT NULL,
  "user_id" varchar NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "expires" timestamp NOT NULL
);
