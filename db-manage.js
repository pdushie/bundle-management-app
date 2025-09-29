#!/usr/bin/env node

/**
 * DB Management Script
 * 
 * This script provides database management functionality:
 * - Check tables existence
 * - Truncate tables
 * - Drop tables
 * - Create tables from schema
 * - Clean test data
 * 
 * Usage:
 *   node db-manage.js <command> [options]
 * 
 * Commands:
 *   check     Check database tables existence
 *   truncate  Truncate specific tables (removes all data)
 *   drop      Drop specific tables (removes table structure)
 *   clean     Clean test data from the database
 *   create    Create tables from schema
 *   info      Show database information
 */

require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Create a Neon SQL client
const sql = neon(process.env.DATABASE_URL);

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bold: "\x1b[1m",
};

// Table definitions - add any tables that should be manageable
const knownTables = [
  'users',
  'sessions',
  'orders',
  'order_entries',
  'phone_entries',
  'history_entries'
];

// Print styled console message
function print(message, style = '') {
  console.log(`${style}${message}${colors.reset}`);
}

// Confirm action with user
function confirmAction(message) {
  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

// Ask for confirmation with specific text
function confirmWithText(message, requiredText) {
  return new Promise((resolve) => {
    rl.question(`${message} Type "${requiredText}" to confirm: `, (answer) => {
      resolve(answer === requiredText);
    });
  });
}

// Check database connection
async function checkConnection() {
  try {
    print("Testing database connection...", colors.blue);
    await sql`SELECT 1`;
    print("✅ Database connection successful!", colors.green);
    return true;
  } catch (error) {
    print(`❌ Database connection failed: ${error.message}`, colors.red + colors.bold);
    return false;
  }
}

// Check if tables exist
async function checkTables() {
  try {
    print("\nChecking tables...", colors.blue);
    
    const tableResults = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    const existingTables = tableResults.map(row => row.table_name);
    
    print("\nTable status:", colors.bold);
    
    knownTables.forEach(table => {
      const exists = existingTables.includes(table);
      if (exists) {
        print(`  ✅ ${table}`, colors.green);
      } else {
        print(`  ❌ ${table}`, colors.red);
      }
    });
    
    // Print any unexpected tables
    const unexpectedTables = existingTables.filter(table => !knownTables.includes(table));
    if (unexpectedTables.length > 0) {
      print("\nUnexpected tables:", colors.yellow);
      unexpectedTables.forEach(table => {
        print(`  ⚠️ ${table}`, colors.yellow);
      });
    }
    
    print(`\nFound ${existingTables.length} tables in total.`, colors.blue);
    return existingTables;
  } catch (error) {
    print(`❌ Error checking tables: ${error.message}`, colors.red);
    return [];
  }
}

// Get table row counts
async function getTableCounts(tables) {
  const counts = {};
  print("\nCounting records in tables:", colors.blue);
  
  for (const table of tables) {
    try {
      const result = await sql.raw(`SELECT COUNT(*) FROM "${table}"`);
      counts[table] = parseInt(result.rows[0].count);
      print(`  - ${table}: ${counts[table]}`, colors.cyan);
    } catch (error) {
      print(`  - ${table}: Error counting`, colors.red);
      counts[table] = -1;
    }
  }
  
  return counts;
}

// Truncate specific tables
async function truncateTables(tables) {
  if (!tables || tables.length === 0) {
    print("❌ No tables specified for truncation", colors.red);
    return false;
  }
  
  print(`\n⚠️ WARNING: You are about to truncate the following tables:`, colors.yellow + colors.bold);
  tables.forEach(table => print(`  - ${table}`, colors.yellow));
  
  print("\n⚠️ This action CANNOT BE UNDONE. All data will be permanently deleted.\n", colors.red + colors.bold);
  
  const confirmed = await confirmWithText("Are you absolutely sure?", "TRUNCATE");
  
  if (!confirmed) {
    print("\n❌ Truncation cancelled. Your data is safe.", colors.green);
    return false;
  }
  
  print("\nProceeding with truncation...", colors.blue);
  
  // Get initial counts
  const initialCounts = await getTableCounts(tables);
  
  // Perform truncation in reverse order to handle foreign keys
  for (const table of [...tables].reverse()) {
    try {
      print(`\nTruncating table ${table}...`, colors.blue);
      await sql.raw(`TRUNCATE TABLE "${table}" CASCADE`);
      print(`✅ Truncated ${table} table`, colors.green);
    } catch (error) {
      print(`❌ Error truncating ${table}: ${error.message}`, colors.red);
      return false;
    }
  }
  
  // Verify tables are empty
  print("\nVerifying tables are empty:", colors.blue);
  let allEmpty = true;
  
  for (const table of tables) {
    try {
      const result = await sql.raw(`SELECT COUNT(*) FROM "${table}"`);
      const count = parseInt(result.rows[0].count);
      
      if (count === 0) {
        print(`  ✅ ${table}: Empty`, colors.green);
      } else {
        print(`  ❌ ${table}: Still has ${count} records`, colors.red);
        allEmpty = false;
      }
    } catch (error) {
      print(`  ❌ ${table}: Error verifying: ${error.message}`, colors.red);
      allEmpty = false;
    }
  }
  
  // Calculate removed counts
  print("\nSummary of removed records:", colors.blue);
  let totalRemoved = 0;
  
  for (const table of tables) {
    if (initialCounts[table] >= 0) {
      print(`  - ${table}: ${initialCounts[table]}`, colors.cyan);
      totalRemoved += initialCounts[table];
    }
  }
  
  print(`  - Total records removed: ${totalRemoved}`, colors.cyan + colors.bold);
  
  return allEmpty;
}

// Drop specific tables
async function dropTables(tables) {
  if (!tables || tables.length === 0) {
    print("❌ No tables specified for dropping", colors.red);
    return false;
  }
  
  print(`\n⚠️ WARNING: You are about to DROP the following tables:`, colors.red + colors.bold);
  tables.forEach(table => print(`  - ${table}`, colors.red));
  
  print("\n⚠️ This action CANNOT BE UNDONE. All data and table structures will be permanently deleted.\n", colors.red + colors.bold);
  
  const confirmed = await confirmWithText("Are you absolutely sure?", "DROP TABLES");
  
  if (!confirmed) {
    print("\n❌ Table drop cancelled. Your tables are safe.", colors.green);
    return false;
  }
  
  print("\nProceeding with dropping tables...", colors.blue);
  
  // Perform dropping in reverse order to handle foreign keys
  for (const table of [...tables].reverse()) {
    try {
      print(`\nDropping table ${table}...`, colors.blue);
      await sql.raw(`DROP TABLE IF EXISTS "${table}" CASCADE`);
      print(`✅ Dropped ${table} table`, colors.green);
    } catch (error) {
      print(`❌ Error dropping ${table}: ${error.message}`, colors.red);
      return false;
    }
  }
  
  // Verify tables are gone
  const remainingTables = await checkTables();
  let allDropped = true;
  
  for (const table of tables) {
    if (remainingTables.includes(table)) {
      print(`  ❌ ${table}: Still exists`, colors.red);
      allDropped = false;
    } else {
      print(`  ✅ ${table}: Successfully dropped`, colors.green);
    }
  }
  
  return allDropped;
}

// Create tables from schema file
async function createTables(schemaPath) {
  try {
    print(`\nReading schema file: ${schemaPath}`, colors.blue);
    const schemaSQL = await fs.readFile(schemaPath, 'utf8');
    
    print("\n⚠️ You are about to create or replace database tables according to the schema file.", colors.yellow);
    print("⚠️ This might overwrite existing tables if they have the same names.", colors.yellow);
    
    const confirmed = await confirmAction("Do you want to proceed?");
    
    if (!confirmed) {
      print("\n❌ Schema creation cancelled.", colors.yellow);
      return false;
    }
    
    print("\nExecuting schema SQL...", colors.blue);
    await sql.raw(schemaSQL);
    print("✅ Schema created successfully!", colors.green);
    
    // Verify tables
    await checkTables();
    
    return true;
  } catch (error) {
    print(`❌ Error creating schema: ${error.message}`, colors.red);
    return false;
  }
}

// Clean test data
async function cleanTestData() {
  print("\nCleaning test data from the database...", colors.blue);
  
  try {
    // Get initial counts
    const tables = await checkTables();
    const initialCounts = await getTableCounts(tables);
    
    // Clean orders table
    print("\nCleaning test orders...", colors.blue);
    const deletedOrders = await sql`
      DELETE FROM orders 
      WHERE 
        id LIKE 'test-%' OR
        id LIKE 'mock-%' OR
        id LIKE 'order-%' OR
        id LIKE 'sample-%' OR
        user_email LIKE '%test%@%' OR
        user_email LIKE '%mock%@%' OR
        user_email LIKE '%@example.com' OR
        user_email LIKE '%@test.com' OR
        user_name LIKE '%test%' OR
        user_name IN ('John Doe', 'Jane Smith', 'Alex Johnson', 'Sam Wilson', 'Maria Garcia', 'Test User') OR
        created_at < '2023-01-01'
      RETURNING id
    `;
    print(`  ✅ Deleted ${deletedOrders.length} test orders`, colors.green);
    
    // Clean history entries
    print("\nCleaning test history entries...", colors.blue);
    const deletedHistory = await sql`
      DELETE FROM history_entries 
      WHERE 
        type = 'test_entry' OR 
        id LIKE 'test-%' OR
        id LIKE 'mock-%' OR
        data::text LIKE '%test%' OR
        data::text LIKE '%mock%' OR
        user_email LIKE '%test%@%' OR
        user_email LIKE '%@example.com' OR
        timestamp < '2023-01-01'
      RETURNING id
    `;
    print(`  ✅ Deleted ${deletedHistory.length} test history entries`, colors.green);
    
    // Clean phone entries
    print("\nCleaning test phone entries...", colors.blue);
    const deletedPhones = await sql`
      DELETE FROM phone_entries 
      WHERE 
        phone_number LIKE '+1%' OR
        phone_number LIKE '555%' OR
        phone_number LIKE '123%' OR
        phone_number LIKE '%12345%' OR
        description LIKE '%test%'
      RETURNING id
    `;
    print(`  ✅ Deleted ${deletedPhones.length} test phone entries`, colors.green);
    
    // Clean orphaned entries
    print("\nCleaning orphaned order entries...", colors.blue);
    const deletedOrphanEntries = await sql`
      DELETE FROM order_entries
      WHERE order_id NOT IN (SELECT id FROM orders)
      RETURNING id
    `;
    print(`  ✅ Deleted ${deletedOrphanEntries.length} orphaned order entries`, colors.green);
    
    // Get final counts
    const finalCounts = await getTableCounts(tables);
    
    // Calculate removed counts
    print("\nSummary of cleaned records:", colors.blue);
    let totalRemoved = 0;
    
    for (const table of tables) {
      if (initialCounts[table] >= 0 && finalCounts[table] >= 0) {
        const removed = initialCounts[table] - finalCounts[table];
        print(`  - ${table}: ${removed}`, colors.cyan);
        totalRemoved += removed;
      }
    }
    
    print(`  - Total records removed: ${totalRemoved}`, colors.cyan + colors.bold);
    
    return true;
  } catch (error) {
    print(`❌ Error cleaning test data: ${error.message}`, colors.red);
    return false;
  }
}

// Show database info
async function showDatabaseInfo() {
  try {
    // Database version
    print("\nDatabase information:", colors.bold + colors.blue);
    
    const versionResult = await sql`SELECT version()`;
    print(`\nPostgreSQL Version: ${versionResult[0].version}`, colors.cyan);
    
    // Database name
    const dbNameResult = await sql`SELECT current_database()`;
    print(`Database Name: ${dbNameResult[0].current_database}`, colors.cyan);
    
    // Schema size
    const sizeResult = await sql`
      SELECT pg_size_pretty(pg_database_size(current_database())) as db_size
    `;
    print(`Database Size: ${sizeResult[0].db_size}`, colors.cyan);
    
    // Check tables and count records
    const tables = await checkTables();
    await getTableCounts(tables);
    
    return true;
  } catch (error) {
    print(`❌ Error getting database info: ${error.message}`, colors.red);
    return false;
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();
  
  print("\n=== Database Management Tool ===", colors.bold + colors.blue);
  
  if (!process.env.DATABASE_URL) {
    print("❌ DATABASE_URL environment variable is not set!", colors.red + colors.bold);
    print("Make sure you have a .env file with DATABASE_URL defined.", colors.yellow);
    rl.close();
    return;
  }
  
  const connected = await checkConnection();
  if (!connected) {
    rl.close();
    return;
  }
  
  // Process commands
  switch (command) {
    case 'check':
      await checkTables();
      break;
      
    case 'info':
      await showDatabaseInfo();
      break;
      
    case 'truncate': {
      const tablesToTruncate = args.slice(1).length > 0 ? args.slice(1) : [];
      
      if (tablesToTruncate.length === 0) {
        print("Available tables:", colors.blue);
        const existingTables = await checkTables();
        
        const selectedTables = [];
        for (const table of existingTables) {
          const include = await confirmAction(`Include table "${table}" for truncation?`);
          if (include) {
            selectedTables.push(table);
          }
        }
        
        if (selectedTables.length === 0) {
          print("❌ No tables selected for truncation", colors.yellow);
          break;
        }
        
        await truncateTables(selectedTables);
      } else {
        // Verify tables exist
        const existingTables = await checkTables();
        const validTables = tablesToTruncate.filter(t => existingTables.includes(t));
        
        if (validTables.length === 0) {
          print("❌ None of the specified tables exist", colors.red);
          break;
        }
        
        if (validTables.length !== tablesToTruncate.length) {
          print("⚠️ Some specified tables don't exist and will be skipped", colors.yellow);
        }
        
        await truncateTables(validTables);
      }
      break;
    }
      
    case 'drop': {
      const tablesToDrop = args.slice(1).length > 0 ? args.slice(1) : [];
      
      if (tablesToDrop.length === 0) {
        print("Available tables:", colors.blue);
        const existingTables = await checkTables();
        
        const selectedTables = [];
        for (const table of existingTables) {
          const include = await confirmAction(`Include table "${table}" for dropping?`);
          if (include) {
            selectedTables.push(table);
          }
        }
        
        if (selectedTables.length === 0) {
          print("❌ No tables selected for dropping", colors.yellow);
          break;
        }
        
        await dropTables(selectedTables);
      } else {
        // Verify tables exist
        const existingTables = await checkTables();
        const validTables = tablesToDrop.filter(t => existingTables.includes(t));
        
        if (validTables.length === 0) {
          print("❌ None of the specified tables exist", colors.red);
          break;
        }
        
        if (validTables.length !== tablesToDrop.length) {
          print("⚠️ Some specified tables don't exist and will be skipped", colors.yellow);
        }
        
        await dropTables(validTables);
      }
      break;
    }
      
    case 'clean':
      await cleanTestData();
      break;
      
    case 'create': {
      const schemaFile = args[1] || './migrations/schema.sql';
      const schemaPath = path.resolve(schemaFile);
      
      try {
        await fs.access(schemaPath);
        await createTables(schemaPath);
      } catch (error) {
        print(`❌ Schema file not found: ${schemaPath}`, colors.red);
        print("Please provide a valid path to the schema SQL file.", colors.yellow);
      }
      break;
    }
      
    default:
      print("Usage: node db-manage.js <command> [options]", colors.yellow);
      print("\nAvailable commands:", colors.bold);
      print("  check                  - Check database tables existence", colors.white);
      print("  info                   - Show database information", colors.white);
      print("  truncate [tables...]   - Truncate specific tables (removes all data)", colors.white);
      print("  drop [tables...]       - Drop specific tables (removes table structure)", colors.white);
      print("  clean                  - Clean test data from the database", colors.white);
      print("  create [schema.sql]    - Create tables from schema file", colors.white);
      print("\nExamples:", colors.bold);
      print("  node db-manage.js check", colors.white);
      print("  node db-manage.js truncate orders order_entries", colors.white);
      print("  node db-manage.js drop", colors.white);
      print("  node db-manage.js clean", colors.white);
      print("  node db-manage.js create ./migrations/schema.sql", colors.white);
      break;
  }
  
  rl.close();
}

main();
