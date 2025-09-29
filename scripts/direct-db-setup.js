// Direct SQL execution to create pricing tables
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function createTables() {
  console.log('Creating pricing tables directly...');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Create pricing_profiles table
    const createProfilesTable = `
    CREATE TABLE IF NOT EXISTS pricing_profiles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      base_price DECIMAL(10, 2) NOT NULL,
      data_price_per_gb DECIMAL(10, 2),
      minimum_charge DECIMAL(10, 2) NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      is_tiered BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );`;
    
    console.log('Creating pricing_profiles table...');
    await client.query(createProfilesTable);
    
    // Create pricing_tiers table
    const createTiersTable = `
    CREATE TABLE IF NOT EXISTS pricing_tiers (
      id SERIAL PRIMARY KEY,
      profile_id INTEGER NOT NULL REFERENCES pricing_profiles(id) ON DELETE CASCADE,
      data_gb DECIMAL(10, 2) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );`;
    
    console.log('Creating pricing_tiers table...');
    await client.query(createTiersTable);
    
    // Create user_pricing_profiles table if it doesn't already exist
    const createUserProfilesTable = `
    CREATE TABLE IF NOT EXISTS user_pricing_profiles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      profile_id INTEGER NOT NULL REFERENCES pricing_profiles(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id)
    );`;
    
    console.log('Creating user_pricing_profiles table...');
    await client.query(createUserProfilesTable);
    
    // Create indexes
    console.log('Creating indexes...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_pricing_tiers_profile_id ON pricing_tiers(profile_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_pricing_profiles_user_id ON user_pricing_profiles(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_pricing_profiles_profile_id ON user_pricing_profiles(profile_id);');

    // Insert sample data
    const standardProfile = `
    INSERT INTO pricing_profiles 
      (name, description, base_price, data_price_per_gb, minimum_charge, is_active, is_tiered) 
    VALUES 
      ('Standard', 'Standard formula-based pricing', 10.00, 5.00, 10.00, true, false)
    ON CONFLICT DO NOTHING
    RETURNING id;`;
    
    console.log('Adding standard pricing profile...');
    const standardResult = await client.query(standardProfile);
    
    // Insert tiered profile
    const tieredProfile = `
    INSERT INTO pricing_profiles 
      (name, description, base_price, data_price_per_gb, minimum_charge, is_active, is_tiered) 
    VALUES 
      ('Premium Tiered', 'Premium tier-based pricing with custom data allocations', 10.00, null, 10.00, true, true)
    ON CONFLICT DO NOTHING
    RETURNING id;`;
    
    console.log('Adding tiered pricing profile...');
    const tieredResult = await client.query(tieredProfile);
    
    if (tieredResult.rows.length > 0) {
      const tieredProfileId = tieredResult.rows[0].id;
      
      // Insert tiers
      const tiers = `
      INSERT INTO pricing_tiers (profile_id, data_gb, price) VALUES
        (${tieredProfileId}, 1, 15.00),
        (${tieredProfileId}, 2, 25.00),
        (${tieredProfileId}, 5, 50.00),
        (${tieredProfileId}, 10, 90.00)
      ON CONFLICT DO NOTHING;`;
      
      console.log('Adding pricing tiers...');
      await client.query(tiers);
    }

    console.log('Setup completed successfully!');
  } catch (error) {
    console.error('Error setting up tables:', error);
  } finally {
    await client.end();
  }
}

createTables();
