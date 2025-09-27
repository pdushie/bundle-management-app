# Database Migration Script
# This script applies the SQL migrations to your Neon PostgreSQL database

echo "Running database migrations..."

# Read the DATABASE_URL from .env file
if [ -f ".env.local" ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable not found"
  echo "Please ensure you have a .env.local file with DATABASE_URL defined"
  exit 1
fi

# Apply migrations
echo "Applying schema migrations..."
psql "$DATABASE_URL" < migrations/schema.sql

echo "Migration completed successfully!"
