#!/usr/bin/env node

/**
 * Pricing Profile Migration Tool
 * 
 * This tool allows migrating pricing profiles between databases (dev → prod or vice versa).
 * It also handles user_pricing_profile assignments.
 * 
 * Usage:
 * node scripts/migrate-pricing-profiles.js export --output profiles.json
 * node scripts/migrate-pricing-profiles.js import --input profiles.json [--env production] [--mode overwrite|skip|merge]
 * node scripts/migrate-pricing-profiles.js transfer --source dev --target prod [--mode overwrite|skip|merge]
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const readline = require('readline');
const { program } = require('commander');

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

// Define the command line interface
program
  .name('migrate-pricing-profiles')
  .description('Migrate pricing profiles between databases')
  .version('1.0.0');

program.command('export')
  .description('Export pricing profiles to a JSON file')
  .requiredOption('--output <file>', 'Output JSON file')
  .option('--env <environment>', 'Environment to export from (default: development)', 'development')
  .option('--include-assignments', 'Include user assignments', false)
  .action(exportProfiles);

program.command('import')
  .description('Import pricing profiles from a JSON file')
  .requiredOption('--input <file>', 'Input JSON file')
  .option('--env <environment>', 'Environment to import to (default: development)', 'development')
  .option('--mode <mode>', 'Import mode (overwrite, skip, merge)', 'skip')
  .option('--include-assignments', 'Import user assignments', false)
  .option('--dry-run', 'Perform a dry run without making changes', false)
  .action(importProfiles);

program.command('transfer')
  .description('Transfer pricing profiles directly between databases')
  .requiredOption('--source <env>', 'Source environment')
  .requiredOption('--target <env>', 'Target environment')
  .option('--mode <mode>', 'Import mode (overwrite, skip, merge)', 'skip')
  .option('--include-assignments', 'Transfer user assignments', false)
  .option('--dry-run', 'Perform a dry run without making changes', false)
  .action(transferProfiles);

program.parse(process.argv);

// Main functions
async function exportProfiles(options) {
  console.log(`Exporting pricing profiles to ${options.output}...`);
  
  const db = createDbConnection(options.env);
  
  try {
    await db.connect();
    
    // Get pricing profiles
    const profilesResult = await db.query('SELECT * FROM pricing_profiles ORDER BY id');
    
    const exportData = {
      profiles: profilesResult.rows,
      assignments: []
    };
    
    // Get user assignments if requested
    if (options.includeAssignments) {
      const assignmentsResult = await db.query(
        'SELECT * FROM user_pricing_profiles ORDER BY user_id, pricing_profile_id'
      );
      
      exportData.assignments = assignmentsResult.rows;
    }
    
    console.log(`Found ${exportData.profiles.length} pricing profiles and ${exportData.assignments.length} user assignments`);
    
    // Write the result to a file
    fs.writeFileSync(
      options.output,
      JSON.stringify(exportData, null, 2)
    );
    
    console.log(`Pricing profiles exported to ${options.output}`);
  } catch (error) {
    console.error('Error exporting pricing profiles:', error);
  } finally {
    await db.end();
  }
}

async function importProfiles(options) {
  console.log(`Importing pricing profiles from ${options.input} to ${options.env} database...`);
  
  // Check if the input file exists
  if (!fs.existsSync(options.input)) {
    console.error(`Input file ${options.input} does not exist`);
    return;
  }
  
  const db = createDbConnection(options.env);
  
  try {
    // Read the input file
    const importData = JSON.parse(fs.readFileSync(options.input, 'utf8'));
    
    console.log(`Found ${importData.profiles.length} pricing profiles in input file`);
    
    if (importData.assignments && options.includeAssignments) {
      console.log(`Found ${importData.assignments.length} user assignments in input file`);
    }
    
    await db.connect();
    
    // Import profiles
    const profilesResult = await importProfilesToDb(
      db, 
      importData.profiles, 
      options.mode,
      options.dryRun
    );
    
    console.log(`Profiles import completed: ${profilesResult.imported} imported, ${profilesResult.skipped} skipped, ${profilesResult.errors} errors`);
    
    // Import assignments if requested
    if (options.includeAssignments && importData.assignments) {
      const assignmentsResult = await importAssignmentsToDb(
        db,
        importData.assignments,
        options.mode,
        options.dryRun
      );
      
      console.log(`Assignments import completed: ${assignmentsResult.imported} imported, ${assignmentsResult.skipped} skipped, ${assignmentsResult.errors} errors`);
    }
  } catch (error) {
    console.error('Error importing pricing profiles:', error);
  } finally {
    await db.end();
  }
}

async function transferProfiles(options) {
  console.log(`Transferring pricing profiles from ${options.source} to ${options.target}...`);
  
  const sourceDb = createDbConnection(options.source);
  const targetDb = createDbConnection(options.target);
  
  try {
    await sourceDb.connect();
    await targetDb.connect();
    
    // Get pricing profiles from source
    const profilesResult = await sourceDb.query('SELECT * FROM pricing_profiles ORDER BY id');
    
    console.log(`Found ${profilesResult.rows.length} pricing profiles in source database`);
    
    // Get user assignments if requested
    let assignments = [];
    
    if (options.includeAssignments) {
      const assignmentsResult = await sourceDb.query(
        'SELECT * FROM user_pricing_profiles ORDER BY user_id, pricing_profile_id'
      );
      
      assignments = assignmentsResult.rows;
      console.log(`Found ${assignments.length} user assignments in source database`);
    }
    
    if (profilesResult.rows.length > 0) {
      // Confirm the transfer
      if (!options.dryRun) {
        const shouldContinue = await confirmAction(
          `Are you sure you want to transfer ${profilesResult.rows.length} pricing profiles` +
          (options.includeAssignments ? ` and ${assignments.length} user assignments` : '') +
          ` from ${options.source} to ${options.target}?`
        );
        
        if (!shouldContinue) {
          console.log('Transfer cancelled');
          return;
        }
      }
      
      // Import profiles to target database
      const profilesImportResult = await importProfilesToDb(
        targetDb, 
        profilesResult.rows, 
        options.mode,
        options.dryRun
      );
      
      console.log(`Profiles transfer completed: ${profilesImportResult.imported} imported, ${profilesImportResult.skipped} skipped, ${profilesImportResult.errors} errors`);
      
      // Import assignments if requested
      if (options.includeAssignments && assignments.length > 0) {
        const assignmentsImportResult = await importAssignmentsToDb(
          targetDb,
          assignments,
          options.mode,
          options.dryRun
        );
        
        console.log(`Assignments transfer completed: ${assignmentsImportResult.imported} imported, ${assignmentsImportResult.skipped} skipped, ${assignmentsImportResult.errors} errors`);
      }
    }
  } catch (error) {
    console.error('Error transferring pricing profiles:', error);
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

async function importProfilesToDb(db, profiles, mode, dryRun) {
  const result = {
    imported: 0,
    skipped: 0,
    errors: 0
  };
  
  for (const profile of profiles) {
    try {
      // Check if the profile already exists
      const existingProfileResult = await db.query(
        'SELECT id, name FROM pricing_profiles WHERE name = $1',
        [profile.name]
      );
      
      const exists = existingProfileResult.rows.length > 0;
      
      if (exists && mode === 'skip') {
        console.log(`Skipping existing pricing profile: ${profile.name}`);
        result.skipped++;
        continue;
      }
      
      if (exists && mode === 'overwrite') {
        if (!dryRun) {
          await db.query(
            `UPDATE pricing_profiles SET 
             description = $1,
             base_cost_per_gb = $2,
             discount_percent = $3,
             min_cost_per_order = $4,
             updated_at = $5
             WHERE name = $6`,
            [
              profile.description,
              profile.base_cost_per_gb,
              profile.discount_percent,
              profile.min_cost_per_order,
              new Date(),
              profile.name
            ]
          );
        }
        
        console.log(`Updated existing pricing profile: ${profile.name}`);
        result.imported++;
        continue;
      }
      
      if (exists && mode === 'merge') {
        // Merge strategy: update non-null fields
        const updates = [];
        const params = [];
        let paramIndex = 1;
        
        for (const [key, value] of Object.entries(profile)) {
          if (key !== 'id' && key !== 'name' && value !== null) {
            updates.push(`${key} = $${paramIndex}`);
            params.push(value);
            paramIndex++;
          }
        }
        
        if (updates.length > 0) {
          params.push(profile.name);
          
          if (!dryRun) {
            await db.query(
              `UPDATE pricing_profiles SET ${updates.join(', ')} WHERE name = $${paramIndex}`,
              params
            );
          }
          
          console.log(`Merged existing pricing profile: ${profile.name}`);
          result.imported++;
        } else {
          console.log(`No changes for pricing profile: ${profile.name}`);
          result.skipped++;
        }
        
        continue;
      }
      
      // Insert new profile
      if (!exists && !dryRun) {
        await db.query(
          `INSERT INTO pricing_profiles (
           name, description, base_cost_per_gb, discount_percent, min_cost_per_order, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            profile.name,
            profile.description,
            profile.base_cost_per_gb,
            profile.discount_percent,
            profile.min_cost_per_order,
            profile.created_at || new Date(),
            profile.updated_at || new Date()
          ]
        );
      }
      
      console.log(`Imported new pricing profile: ${profile.name}`);
      result.imported++;
    } catch (error) {
      console.error(`Error importing pricing profile ${profile.name}:`, error);
      result.errors++;
    }
  }
  
  return result;
}

async function importAssignmentsToDb(db, assignments, mode, dryRun) {
  const result = {
    imported: 0,
    skipped: 0,
    errors: 0
  };
  
  for (const assignment of assignments) {
    try {
      // Check if the user exists
      const userExists = await db.query(
        'SELECT id FROM users WHERE id = $1',
        [assignment.user_id]
      );
      
      if (userExists.rows.length === 0) {
        console.log(`Skipping assignment - user ${assignment.user_id} does not exist`);
        result.skipped++;
        continue;
      }
      
      // Check if the pricing profile exists
      const profileExists = await db.query(
        'SELECT id FROM pricing_profiles WHERE id = $1',
        [assignment.pricing_profile_id]
      );
      
      if (profileExists.rows.length === 0) {
        console.log(`Skipping assignment - pricing profile ${assignment.pricing_profile_id} does not exist`);
        result.skipped++;
        continue;
      }
      
      // Check if the assignment already exists
      const existingAssignment = await db.query(
        'SELECT id FROM user_pricing_profiles WHERE user_id = $1 AND pricing_profile_id = $2',
        [assignment.user_id, assignment.pricing_profile_id]
      );
      
      const exists = existingAssignment.rows.length > 0;
      
      if (exists) {
        console.log(`Assignment already exists for user ${assignment.user_id} and profile ${assignment.pricing_profile_id}`);
        result.skipped++;
        continue;
      }
      
      // Insert new assignment
      if (!dryRun) {
        await db.query(
          'INSERT INTO user_pricing_profiles (user_id, pricing_profile_id, created_at, updated_at) VALUES ($1, $2, $3, $4)',
          [
            assignment.user_id,
            assignment.pricing_profile_id,
            assignment.created_at || new Date(),
            assignment.updated_at || new Date()
          ]
        );
      }
      
      console.log(`Imported assignment for user ${assignment.user_id} and profile ${assignment.pricing_profile_id}`);
      result.imported++;
    } catch (error) {
      console.error(`Error importing assignment for user ${assignment.user_id} and profile ${assignment.pricing_profile_id}:`, error);
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
