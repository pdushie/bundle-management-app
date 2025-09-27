# PostgreSQL Database Management Guide for Bundle Management App

This guide explains how to manage the PostgreSQL database running on Neon for your bundle management app.

## Database Structure

The application uses the following main tables:

- `users` - User accounts and authentication data
- `sessions` - User session data for NextAuth
- `orders` - Order records with status and user information
- `order_entries` - Individual entries within an order
- `history_entries` - Records of data import history
- `phone_entries` - Phone number entries from imports

## Database Management Scripts

The following scripts are available to help manage your database:

### 1. `migrate.ps1`

This PowerShell script is used to apply the initial schema migration to your database.

```powershell
# Run the migration script
.\migrate.ps1
```

### 2. `db-manage.ps1`

This PowerShell script provides several database management functions:

```powershell
# Check the database connection and schema
.\db-manage.ps1 -check

# Create a database backup
.\db-manage.ps1 -backup

# Specify a custom backup location
.\db-manage.ps1 -backup -backupPath "D:\backups\bundle-app"
```

## SQL Migration Files

The application includes several SQL files for database management:

- `migrations/schema.sql` - Main database schema
- `migrations/check-schema.sql` - Script to check for missing tables/columns
- `migrations/upgrade-schema.sql` - Script to add missing columns or indices

## Environment Setup

The database connection string should be specified in a `.env.local` file in the project root:

```
DATABASE_URL=postgres://username:password@hostname:port/database?sslmode=require
```

## Database Connection Requirements

1. The PostgreSQL database must be accessible from your application
2. The user specified in the connection string must have permissions to create and modify tables
3. For Neon, make sure the connection string includes the correct SSL mode

## Common Issues and Solutions

### Connection Errors

If you experience connection errors:

1. Check that the DATABASE_URL is correct
2. Ensure your IP address is allowed in Neon's connection settings
3. Verify that SSL is properly configured (Neon requires SSL)

### Missing Tables or Columns

Run the check script to identify any issues:

```powershell
.\db-manage.ps1 -check
```

Then run the upgrade script to add missing elements:

```powershell
psql $env:DATABASE_URL -f migrations/upgrade-schema.sql
```

### Migration Failures

If migrations fail:

1. Check the error messages for specific issues
2. Run the check script to identify missing elements
3. Consider applying migrations manually in the Neon web console

## Regular Maintenance

It's recommended to:

1. Create regular backups using the `-backup` parameter
2. Periodically check the schema for any issues with the `-check` parameter
3. Review the database logs in the Neon dashboard for performance issues

## Additional Resources

- [Neon Documentation](https://neon.tech/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
