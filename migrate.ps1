# Database Migration Script for Windows
# This script applies the SQL migrations to your Neon PostgreSQL database

Write-Host "Running database migrations..." -ForegroundColor Cyan

# Read the DATABASE_URL from .env.local file
if (Test-Path ".env.local") {
    Get-Content ".env.local" | ForEach-Object {
        if ($_ -match "DATABASE_URL=(.*)") {
            $env:DATABASE_URL = $matches[1]
        }
    }
}

if (-not $env:DATABASE_URL) {
    Write-Host "Error: DATABASE_URL environment variable not found" -ForegroundColor Red
    Write-Host "Please ensure you have a .env.local file with DATABASE_URL defined" -ForegroundColor Red
    exit 1
}

# Apply migrations
Write-Host "Applying schema migrations..." -ForegroundColor Cyan

# Check if psql is available
try {
    $psqlVersion = (& psql --version 2>&1)
    if ($LASTEXITCODE -eq 0) {
        # Apply migrations using psql
        & psql $env:DATABASE_URL -f migrations/schema.sql
    } else {
        throw "psql not found"
    }
} catch {
    Write-Host "Warning: psql command not found. Trying alternative method..." -ForegroundColor Yellow
    
    # Try using curl to send the SQL script to the database API endpoint if it's Neon
    # This is a simplified alternative and might need adjustments based on your setup
    if ($env:DATABASE_URL -like "*neon.tech*") {
        $sqlContent = Get-Content -Path "migrations/schema.sql" -Raw
        
        # Extract credentials from DATABASE_URL
        if ($env:DATABASE_URL -match "postgres://(.*?):(.*?)@(.*?)/(.*?)(\?|$)") {
            $username = $matches[1]
            $password = $matches[2]
            $host = $matches[3]
            $dbname = $matches[4]
            
            Write-Host "Using web interface to apply migrations. Please visit Neon dashboard and run the SQL script manually." -ForegroundColor Yellow
            Write-Host "SQL script location: migrations/schema.sql" -ForegroundColor Yellow
        } else {
            Write-Host "Could not parse DATABASE_URL. Please run the migrations manually." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Could not run migrations automatically. Please run them manually:" -ForegroundColor Red
        Write-Host "psql $env:DATABASE_URL -f migrations/schema.sql" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "Migration completed successfully!" -ForegroundColor Green
