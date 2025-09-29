#!/bin/bash
# Database Management Script for Bundle Management App
# This script provides a unified interface for database operations

# ANSI color codes
RESET="\033[0m"
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
BLUE="\033[34m"
MAGENTA="\033[35m"
CYAN="\033[36m"
BOLD="\033[1m"

# Function to print colored text
print_color() {
  local text="$1"
  local color="$2"
  echo -e "${color}${text}${RESET}"
}

# Show script banner
show_banner() {
  print_color "┌────────────────────────────────────────────────┐" "$BLUE"
  print_color "│              DATABASE MANAGEMENT               │" "${BLUE}${BOLD}"
  print_color "└────────────────────────────────────────────────┘" "$BLUE"
  echo ""
}

# Show help information
show_help() {
  print_color "Usage: ./db-manage.sh <command> [options]" "$YELLOW"
  echo ""
  print_color "Available commands:" "$BOLD"
  echo "  check                  - Check database tables existence"
  echo "  info                   - Show database information"
  echo "  truncate [tables...]   - Truncate specific tables (removes all data)"
  echo "  drop [tables...]       - Drop specific tables (removes table structure)"
  echo "  clean                  - Clean test data from the database"
  echo "  create [schema.sql]    - Create tables from schema file"
  echo "  backup [path]          - Backup the database (default: ./backups)"
  echo "  help                   - Show this help message"
  echo ""
  print_color "Examples:" "$BOLD"
  echo "  ./db-manage.sh check"
  echo "  ./db-manage.sh info"
  echo "  ./db-manage.sh truncate orders order_entries"
  echo "  ./db-manage.sh backup ./my-backups"
  echo "  ./db-manage.sh clean"
  echo ""
}

# Load environment variables
load_env_variables() {
  print_color "Loading environment variables..." "$CYAN"
  
  if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
    print_color "Environment variables loaded from .env.local" "$GREEN"
  elif [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
    print_color "Environment variables loaded from .env" "$GREEN"
  else
    print_color "Warning: No .env or .env.local file found!" "$YELLOW"
  fi
  
  if [ -z "$DATABASE_URL" ]; then
    print_color "Error: DATABASE_URL environment variable is not set!" "$RED$BOLD"
    print_color "Make sure you have a .env or .env.local file with DATABASE_URL defined." "$YELLOW"
    return 1
  fi
  
  return 0
}

# Test database connection
test_db_connection() {
  print_color "Testing database connection..." "$CYAN"
  
  # Try with psql
  if command -v psql &> /dev/null; then
    if psql "$DATABASE_URL" -c "SELECT 1" &> /dev/null; then
      print_color "Database connection successful!" "$GREEN"
      return 0
    fi
  fi
  
  # Try with Node.js
  if command -v node &> /dev/null; then
    cat > temp-db-test.js << EOF
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.query('SELECT 1')
  .then(() => {
    console.log('Connection successful');
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection error:', err.message);
    process.exit(1);
  });
EOF
    
    if node temp-db-test.js; then
      print_color "Database connection successful via Node.js!" "$GREEN"
      rm temp-db-test.js
      return 0
    fi
    
    rm -f temp-db-test.js
  fi
  
  print_color "Error: Could not connect to the database" "$RED"
  print_color "Please check your DATABASE_URL and network connection" "$YELLOW"
  return 1
}

# Check database schema
check_db_schema() {
  print_color "Checking database schema..." "$CYAN"
  
  if [ -f migrations/check-schema.sql ]; then
    if command -v psql &> /dev/null; then
      print_color "Running schema check SQL..." "$CYAN"
      psql "$DATABASE_URL" -f migrations/check-schema.sql
      return $?
    else
      print_color "Error: psql command not found" "$RED"
      print_color "Please install PostgreSQL client tools" "$YELLOW"
      return 1
    fi
  else
    print_color "Error: Schema check SQL file not found" "$RED"
    print_color "Expected at: migrations/check-schema.sql" "$YELLOW"
    return 1
  fi
}

# Backup database
backup_database() {
  local backup_path="${1:-./backups}"
  
  print_color "Starting database backup..." "$CYAN"
  
  # Ensure backup directory exists
  mkdir -p "$backup_path"
  
  local timestamp=$(date +"%Y-%m-%d_%H-%M-%S")
  local backup_file="${backup_path}/backup_${timestamp}.sql"
  
  if command -v pg_dump &> /dev/null; then
    print_color "Running pg_dump to create backup..." "$CYAN"
    
    if pg_dump "$DATABASE_URL" --format=plain --no-owner --no-acl -f "$backup_file"; then
      print_color "Database backup successful: $backup_file" "$GREEN"
      return 0
    else
      print_color "Error creating backup" "$RED"
      return 1
    fi
  else
    print_color "Error: pg_dump command not found" "$RED"
    print_color "Please install PostgreSQL client tools" "$YELLOW"
    return 1
  fi
}

# Run Node.js db-manage.js script
run_node_manager() {
  local db_manage_script="./db-manage.js"
  
  if [ ! -f "$db_manage_script" ]; then
    print_color "Error: db-manage.js script not found!" "$RED"
    print_color "Expected location: $db_manage_script" "$YELLOW"
    return 1
  fi
  
  print_color "Running Node.js database manager..." "$CYAN"
  
  # Execute the Node.js script
  node "$db_manage_script" "$@"
  
  # Check the exit code
  if [ $? -eq 0 ]; then
    print_color "Command completed successfully." "$GREEN"
    return 0
  else
    print_color "Command failed with exit code: $?" "$RED"
    return 1
  fi
}

# Main execution
show_banner

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  print_color "Error: Node.js is not installed or not in PATH!" "$RED$BOLD"
  print_color "Please install Node.js to use this script." "$YELLOW"
  exit 1
fi

command="$1"
shift 1  # Remove first argument, leaving the rest for passing to commands

case "$command" in
  "help" | "")
    show_help
    ;;
    
  "check")
    if load_env_variables && test_db_connection; then
      check_db_schema
    else
      exit 1
    fi
    ;;
    
  "backup")
    if load_env_variables && test_db_connection; then
      backup_database "$1"
    else
      exit 1
    fi
    ;;
    
  "info")
    if load_env_variables; then
      run_node_manager "info"
    else
      exit 1
    fi
    ;;
    
  "truncate")
    if load_env_variables; then
      run_node_manager "truncate" "$@"
    else
      exit 1
    fi
    ;;
    
  "drop")
    if load_env_variables; then
      run_node_manager "drop" "$@"
    else
      exit 1
    fi
    ;;
    
  "clean")
    if load_env_variables; then
      run_node_manager "clean"
    else
      exit 1
    fi
    ;;
    
  "create")
    if load_env_variables; then
      run_node_manager "create" "$@"
    else
      exit 1
    fi
    ;;
    
  *)
    print_color "Unknown command: $command" "$RED"
    show_help
    exit 1
    ;;
esac

echo ""
print_color "Database management script completed!" "$GREEN"
exit 0
