-- Drop the existing sessions table if it exists
DROP TABLE IF EXISTS "sessions";

-- Create the sessions table with the correct structure
CREATE TABLE IF NOT EXISTS "sessions" (
  "id" varchar PRIMARY KEY NOT NULL,
  "session_token" varchar UNIQUE NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "expires" timestamp NOT NULL
);

-- This ensures the session_token is indexed for faster lookups
CREATE INDEX IF NOT EXISTS "sessions_session_token_idx" ON "sessions" ("session_token");
