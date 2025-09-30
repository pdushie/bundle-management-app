import { neonClient } from '../src/lib/db';

async function runSqlMigration() {
  try {
    console.log('Running migration to add estimated_cost column...');
    
    // First check if the column exists
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'estimated_cost'
    `;
    
    const result = await neonClient.query(checkColumnQuery);
    
    if (result.rows.length === 0) {
      console.log('Column does not exist. Adding estimated_cost column...');
      
      // Add the column
      const addColumnQuery = `
        ALTER TABLE orders ADD COLUMN estimated_cost DECIMAL(10,2);
      `;
      
      await neonClient.query(addColumnQuery);
      console.log('Column added successfully.');
      
      // Update existing records to set estimated_cost = cost
      const updateQuery = `
        UPDATE orders SET estimated_cost = cost WHERE cost IS NOT NULL;
      `;
      
      await neonClient.query(updateQuery);
      console.log('Existing records updated successfully.');
    } else {
      console.log('Column already exists. Migration not needed.');
    }
    
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

runSqlMigration();
