# Database Management PowerShell Script
# This script helps manage database operations for the Bundle Management App

param (
    [Parameter(Position = 0, Mandatory = $false)]
    [ValidateSet("check", "info", "truncate", "drop", "clean", "create", "backup", "help", "node")]
    [string]$Command = "help",
    
    [Parameter(Position = 1, ValueFromRemainingArguments = $true)]
    [string[]]$AdditionalArgs,
    
    [Parameter(Mandatory=$false)]
    [string]$backupPath = "./backups"
)

# Set console colors for better readability
$infoColor = "Cyan"
$successColor = "Green"
$warningColor = "Yellow"
$errorColor = "Red"

# ANSI color codes for PowerShell
$ColorReset = "`e[0m"
$ColorRed = "`e[31m"
$ColorGreen = "`e[32m"
$ColorYellow = "`e[33m"
$ColorBlue = "`e[34m"
$ColorMagenta = "`e[35m"
$ColorCyan = "`e[36m"
$ColorBold = "`e[1m"

function Write-ColorText {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Text,
        
        [Parameter(Mandatory = $false)]
        [string]$Color = ""
    )
    
    Write-Host "$Color$Text$ColorReset"
}

function Show-Banner {
    Write-ColorText "┌────────────────────────────────────────────────┐" $ColorBlue
    Write-ColorText "│              DATABASE MANAGEMENT               │" "$ColorBlue$ColorBold"
    Write-ColorText "└────────────────────────────────────────────────┘" $ColorBlue
    Write-Host ""
}

function Show-Help {
    Write-ColorText "Usage: ./db-manage.ps1 <command> [options]" $ColorYellow
    Write-Host ""
    Write-ColorText "Available commands:" $ColorBold
    Write-Host "  check                  - Check database tables existence"
    Write-Host "  info                   - Show database information"
    Write-Host "  truncate [tables...]   - Truncate specific tables (removes all data)"
    Write-Host "  drop [tables...]       - Drop specific tables (removes table structure)"
    Write-Host "  clean                  - Clean test data from the database"
    Write-Host "  create [schema.sql]    - Create tables from schema file"
    Write-Host "  backup [path]          - Backup the database (default: ./backups)"
    Write-Host "  node [args...]         - Run db-manage.js directly with Node.js"
    Write-Host "  help                   - Show this help message"
    Write-Host ""
    Write-ColorText "Examples:" $ColorBold
    Write-Host "  ./db-manage.ps1 check"
    Write-Host "  ./db-manage.ps1 info"
    Write-Host "  ./db-manage.ps1 truncate orders order_entries"
    Write-Host "  ./db-manage.ps1 backup ./my-backups"
    Write-Host "  ./db-manage.ps1 clean"
    Write-Host ""
}

# Function to load environment variables
function Import-EnvVariables {
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
function Test-DatabaseSchema {
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
            $dbHost = $matches[1]
            $dbName = $matches[2]
            
            $output = & pg_dump -O -x -h $dbHost -d $dbName -f $backupFile 2>&1
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

# Run Node.js db-manage.js script
function Invoke-NodeDbManage {
    param (
        [Parameter(Mandatory = $false)]
        [string[]]$Arguments
    )
    
    $dbManageScript = Join-Path $PSScriptRoot "db-manage.js"
    if (-not (Test-Path $dbManageScript)) {
        Write-Host "Error: db-manage.js script not found!" -ForegroundColor $errorColor
        Write-Host "Expected location: $dbManageScript" -ForegroundColor $warningColor
        return $false
    }
    
    Write-Host "Running Node.js database manager..." -ForegroundColor $infoColor
    
    # Build the argument list
    $nodeArgs = @($dbManageScript)
    if ($Arguments) {
        $nodeArgs += $Arguments
    }
    
    # Execute the Node.js script
    & node $nodeArgs
    
    # Check the exit code
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Command completed successfully." -ForegroundColor $successColor
        return $true
    } else {
        Write-Host "Command failed with exit code: $LASTEXITCODE" -ForegroundColor $errorColor
        return $false
    }
}

# Main script execution
Show-Banner

# Process commands based on the command parameter
switch ($Command) {
    "help" {
        Show-Help
    }
    
    "check" {
        if (-not (Import-EnvVariables)) {
            exit 1
        }
        
        if (-not (Test-DatabaseConnection)) {
            exit 1
        }
        
        Test-DatabaseSchema
    }
    
    "backup" {
        if (-not (Import-EnvVariables)) {
            exit 1
        }
        
        if (-not (Test-DatabaseConnection)) {
            exit 1
        }
        
        # Override backup path if provided as an argument
        if ($AdditionalArgs -and $AdditionalArgs.Count -gt 0) {
            $backupPath = $AdditionalArgs[0]
        }
        
        Backup-Database
    }
    
    "node" {
        if (-not (Import-EnvVariables)) {
            exit 1
        }
        
        Invoke-NodeDbManage -Arguments $AdditionalArgs
    }
    
    "info" {
        if (-not (Import-EnvVariables)) {
            exit 1
        }
        
        Invoke-NodeDbManage -Arguments @("info")
    }
    
    "truncate" {
        if (-not (Import-EnvVariables)) {
            exit 1
        }
        
        Invoke-NodeDbManage -Arguments (@("truncate") + $AdditionalArgs)
    }
    
    "drop" {
        if (-not (Import-EnvVariables)) {
            exit 1
        }
        
        Invoke-NodeDbManage -Arguments (@("drop") + $AdditionalArgs)
    }
    
    "clean" {
        if (-not (Import-EnvVariables)) {
            exit 1
        }
        
        Invoke-NodeDbManage -Arguments @("clean")
    }
    
    "create" {
        if (-not (Import-EnvVariables)) {
            exit 1
        }
        
        Invoke-NodeDbManage -Arguments (@("create") + $AdditionalArgs)
    }
}

Write-Host ""
Write-Host "Database management script completed!" -ForegroundColor $successColor
