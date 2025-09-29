#!/usr/bin/env node

/**
 * User Migration Tool
 * 
 * This tool allows migrating users between databases (dev → prod or vice versa).
 * It properly handles sensitive data like passwords and user details.
 * 
 * Usage:
 * node scripts/migrate-users.js export --output users.json [--where "column=value"]
 * node scripts/migrate-users.js import --input users.json [--env production] [--mode overwrite|skip|merge]
 * node scripts/migrate-users.js transfer --source dev --target prod [--where "column=value"] [--mode overwrite|skip|merge]
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const readline = require('readline');
const bcrypt = require('bcrypt');
const { program } = require('commander');

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

// Define the command line interface
program
  .name('migrate-users')
  .description('Migrate users between databases')
  .version('1.0.0');

program.command('export')
  .description('Export users to a JSON file')
  .requiredOption('--output <file>', 'Output JSON file')
  .option('--where <condition>', 'SQL WHERE condition for filtering users')
  .option('--env <environment>', 'Environment to export from (default: development)', 'development')
  .action(exportUsers);

program.command('import')
  .description('Import users from a JSON file')
  .requiredOption('--input <file>', 'Input JSON file')
  .option('--env <environment>', 'Environment to import to (default: development)', 'development')
  .option('--mode <mode>', 'Import mode (overwrite, skip, merge)', 'skip')
  .option('--dry-run', 'Perform a dry run without making changes', false)
  .action(importUsers);

program.command('transfer')
  .description('Transfer users directly between databases')
  .requiredOption('--source <env>', 'Source environment')
  .requiredOption('--target <env>', 'Target environment')
  .option('--where <condition>', 'SQL WHERE condition for filtering users')
  .option('--mode <mode>', 'Import mode (overwrite, skip, merge)', 'skip')
  .option('--dry-run', 'Perform a dry run without making changes', false)
  .action(transferUsers);

program.parse(process.argv);

// Main functions
async function exportUsers(options) {
  console.log(`Exporting users to ${options.output}...`);
  
  const db = createDbConnection(options.env);
  
  try {
    await db.connect();
    
    // Build the query
    let query = 'SELECT * FROM users';
    const params = [];
    
    if (options.where) {
      query += ` WHERE ${options.where}`;
    }
    
    // Execute the query
    const result = await db.query(query, params);
    
    console.log(`Found ${result.rows.length} users`);
    
    // Write the result to a file
    fs.writeFileSync(
      options.output,
      JSON.stringify(result.rows, null, 2)
    );
    
    console.log(`Users exported to ${options.output}`);
  } catch (error) {
    console.error('Error exporting users:', error);
  } finally {
    await db.end();
  }
}

async function importUsers(options) {
  console.log(`Importing users from ${options.input} to ${options.env} database...`);
  
  // Check if the input file exists
  if (!fs.existsSync(options.input)) {
    console.error(`Input file ${options.input} does not exist`);
    return;
  }
  
  const db = createDbConnection(options.env);
  
  try {
    // Read the input file
    const users = JSON.parse(fs.readFileSync(options.input, 'utf8'));
    
    console.log(`Found ${users.length} users in input file`);
    
    await db.connect();
    
    // Import users
    const importResult = await importUsersToDB(db, users, options.mode, options.dryRun);
    
    console.log(`Import completed: ${importResult.imported} imported, ${importResult.skipped} skipped, ${importResult.errors} errors`);
  } catch (error) {
    console.error('Error importing users:', error);
  } finally {
    await db.end();
  }
}

async function transferUsers(options) {
  console.log(`Transferring users from ${options.source} to ${options.target}...`);
  
  const sourceDb = createDbConnection(options.source);
  const targetDb = createDbConnection(options.target);
  
  try {
    await sourceDb.connect();
    await targetDb.connect();
    
    // Build the query
    let query = 'SELECT * FROM users';
    const params = [];
    
    if (options.where) {
      query += ` WHERE ${options.where}`;
    }
    
    // Execute the query
    const result = await sourceDb.query(query, params);
    
    console.log(`Found ${result.rows.length} users in source database`);
    
    if (result.rows.length > 0) {
      // Confirm the transfer
      if (!options.dryRun) {
        const shouldContinue = await confirmAction(
          `Are you sure you want to transfer ${result.rows.length} users from ${options.source} to ${options.target}?`
        );
        
        if (!shouldContinue) {
          console.log('Transfer cancelled');
          return;
        }
      }
      
      // Import users to target database
      const importResult = await importUsersToDB(
        targetDb, 
        result.rows, 
        options.mode,
        options.dryRun
      );
      
      console.log(`Transfer completed: ${importResult.imported} imported, ${importResult.skipped} skipped, ${importResult.errors} errors`);
    }
  } catch (error) {
    console.error('Error transferring users:', error);
  } finally {
    await sourceDb.end();
    await targetDb.end();
  }
}

// Helper functions
function createDbConnection(env) {
  const connectionString = env === 'production'
    ? process.env.DATABASE_URL_PRODUCTION || process.env.DATABASE_URL
    : process.env.DATABASE_URL;
  
  return new Pool({ connectionString });
}

async function importUsersToDB(db, users, mode, dryRun) {
  const result = {
    imported: 0,
    skipped: 0,
    errors: 0
  };
  
  for (const user of users) {
    try {
      // Check if the user already exists
      const existingUserResult = await db.query(
        'SELECT id, email FROM users WHERE email = $1',
        [user.email]
      );
      
      const exists = existingUserResult.rows.length > 0;
      
      if (exists && mode === 'skip') {
        console.log(`Skipping existing user: ${user.email}`);
        result.skipped++;
        continue;
      }
      
      if (exists && mode === 'overwrite') {
        if (!dryRun) {
          await db.query(
            'UPDATE users SET name = $1, password = $2, role = $3, status = $4, email_verified = $5, created_at = $6, updated_at = $7, image = $8 WHERE email = $9',
            [
              user.name,
              user.password,
              user.role,
              user.status,
              user.email_verified,
              user.created_at,
              user.updated_at || new Date(),
              user.image,
              user.email
            ]
          );
        }
        
        console.log(`Updated existing user: ${user.email}`);
        result.imported++;
        continue;
      }
      
      if (exists && mode === 'merge') {
        // Merge strategy: update non-null fields
        const updates = [];
        const params = [];
        let paramIndex = 1;
        
        for (const [key, value] of Object.entries(user)) {
          if (key !== 'id' && key !== 'email' && value !== null) {
            updates.push(`${key} = $${paramIndex}`);
            params.push(value);
            paramIndex++;
          }
        }
        
        if (updates.length > 0) {
          params.push(user.email);
          
          if (!dryRun) {
            await db.query(
              `UPDATE users SET ${updates.join(', ')} WHERE email = $${paramIndex}`,
              params
            );
          }
          
          console.log(`Merged existing user: ${user.email}`);
          result.imported++;
        } else {
          console.log(`No changes for user: ${user.email}`);
          result.skipped++;
        }
        
        continue;
      }
      
      // Insert new user
      if (!exists && !dryRun) {
        await db.query(
          'INSERT INTO users (name, email, password, role, status, email_verified, created_at, updated_at, image) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [
            user.name,
            user.email,
            user.password,
            user.role,
            user.status,
            user.email_verified,
            user.created_at,
            user.updated_at || new Date(),
            user.image
          ]
        );
      }
      
      console.log(`Imported new user: ${user.email}`);
      result.imported++;
    } catch (error) {
      console.error(`Error importing user ${user.email}:`, error);
      result.errors++;
    }
  }
  
  return result;
}

async function confirmAction(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(`${message} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

// Execute the command
if (!process.argv.slice(2).length) {
  program.help();
}
