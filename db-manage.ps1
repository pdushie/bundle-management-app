# Database Management PowerShell Script
# This script helps manage database operations for the Bundle Management App

param (
    [Parameter(Mandatory=$false)]
    [switch]$check,
    
    [Parameter(Mandatory=$false)]
    [switch]$backup,
    
    [Parameter(Mandatory=$false)]
    [string]$backupPath = "./backups"
)

# Set console colors for better readability
$infoColor = "Cyan"
$successColor = "Green"
$warningColor = "Yellow"
$errorColor = "Red"

# Function to load environment variables
function Load-EnvVariables {
    Write-Host "Loading environment variables..." -ForegroundColor $infoColor
    
    if (Test-Path ".env.local") {
        Get-Content ".env.local" | ForEach-Object {
            if ($_ -match "(.+?)=(.+)") {
                $name = $matches[1]
                $value = $matches[2]
                Set-Item -Path "env:$name" -Value $value
                Write-Host "Loaded: $name" -ForegroundColor $infoColor
            }
        }
    } else {
        Write-Host "Warning: .env.local file not found!" -ForegroundColor $warningColor
        return $false
    }
    
    if (-not $env:DATABASE_URL) {
        Write-Host "Error: DATABASE_URL environment variable not found" -ForegroundColor $errorColor
        Write-Host "Please ensure you have a .env.local file with DATABASE_URL defined" -ForegroundColor $warningColor
        return $false
    }
    
    return $true
}

# Function to check database connection
function Test-DatabaseConnection {
    Write-Host "Testing database connection..." -ForegroundColor $infoColor
    
    try {
        # Try with psql
        $output = & psql $env:DATABASE_URL -c "SELECT 1" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Database connection successful!" -ForegroundColor $successColor
            return $true
        }
    } catch {
        Write-Host "Warning: Could not connect using psql" -ForegroundColor $warningColor
    }
    
    try {
        # Try with node
        $script = "
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
        "
        
        $tempFile = "temp-db-test.js"
        Set-Content -Path $tempFile -Value $script
        
        $nodeOutput = & node $tempFile 2>&1
        if ($LASTEXITCODE -eq 0 -and $nodeOutput -contains "Connection successful") {
            Write-Host "Database connection successful via Node.js!" -ForegroundColor $successColor
            Remove-Item -Path $tempFile
            return $true
        }
        
        Remove-Item -Path $tempFile
    } catch {
        Write-Host "Warning: Could not connect using Node.js" -ForegroundColor $warningColor
    }
    
    Write-Host "Error: Could not connect to the database" -ForegroundColor $errorColor
    Write-Host "Please check your DATABASE_URL and network connection" -ForegroundColor $warningColor
    return $false
}

# Function to check database schema
function Check-DatabaseSchema {
    Write-Host "Checking database schema..." -ForegroundColor $infoColor
    
    try {
        # Try with psql
        $output = & psql $env:DATABASE_URL -f migrations/check-schema.sql 2>&1
        Write-Host $output -ForegroundColor $infoColor
        return $true
    } catch {
        Write-Host "Error running schema check: $_" -ForegroundColor $errorColor
        return $false
    }
}

# Function to back up the database
function Backup-Database {
    Write-Host "Starting database backup..." -ForegroundColor $infoColor
    
    # Ensure backup directory exists
    if (-not (Test-Path $backupPath)) {
        New-Item -Path $backupPath -ItemType Directory
    }
    
    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $backupFile = Join-Path $backupPath "backup_$timestamp.sql"
    
    try {
        # Extract database name from connection string for pg_dump
        if ($env:DATABASE_URL -match "postgres://.*?:.*?@(.*?)/(.*?)(\?|$)") {
            $host = $matches[1]
            $dbName = $matches[2]
            
            $output = & pg_dump -O -x -h $host -d $dbName -f $backupFile 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Database backup successful: $backupFile" -ForegroundColor $successColor
                return $true
            } else {
                Write-Host "Error creating backup: $output" -ForegroundColor $errorColor
                return $false
            }
        } else {
            Write-Host "Could not extract database details from connection string" -ForegroundColor $errorColor
            return $false
        }
    } catch {
        Write-Host "Error creating backup: $_" -ForegroundColor $errorColor
        
        Write-Host "Attempting backup with pg_dump directly..." -ForegroundColor $warningColor
        try {
            $output = & pg_dump $env:DATABASE_URL --format=plain --no-owner --no-acl -f $backupFile 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Database backup successful: $backupFile" -ForegroundColor $successColor
                return $true
            } else {
                Write-Host "Error creating backup: $output" -ForegroundColor $errorColor
                return $false
            }
        } catch {
            Write-Host "Backup failed: $_" -ForegroundColor $errorColor
            return $false
        }
    }
}

# Main script execution
if (-not (Load-EnvVariables)) {
    exit 1
}

if (-not (Test-DatabaseConnection)) {
    exit 1
}

if ($check) {
    Check-DatabaseSchema
}

if ($backup) {
    Backup-Database
}

Write-Host "Database management script completed successfully!" -ForegroundColor $successColor
