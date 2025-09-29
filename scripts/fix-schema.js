// Comprehensive schema fix script for the bundle management app
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function fixSchema() {
  console.log('Fixing database schema...');
  
  // Create a new pool using the same connection string as the app
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
  });
  
  try {
    console.log('Database URL:', process.env.DATABASE_URL ? 'Found' : 'Missing');
    
    // 1. Check if pricing_profiles table exists and create if needed
    console.log('Checking pricing_profiles table...');
    const checkPricingProfilesTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pricing_profiles'
      );
    `);

    if (!checkPricingProfilesTable.rows[0].exists) {
      console.log('Creating pricing_profiles table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS pricing_profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          base_price NUMERIC(10, 2),
          price_per_gb NUMERIC(10, 2),
          data_price_per_gb NUMERIC(10, 2),
          is_tiered BOOLEAN DEFAULT false,
          minimum_charge NUMERIC(10, 2),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('Created pricing_profiles table');
    } else {
      // Check if is_tiered column exists
      const checkTieredColumn = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'pricing_profiles' 
          AND column_name = 'is_tiered'
        );
      `);

      if (!checkTieredColumn.rows[0].exists) {
        console.log('Adding is_tiered column to pricing_profiles table...');
        await pool.query(`
          ALTER TABLE pricing_profiles 
          ADD COLUMN is_tiered BOOLEAN DEFAULT false;
        `);
        console.log('Successfully added is_tiered column to pricing_profiles table.');
      }
    }

    // 2. Check if pricing_tiers table exists and create if needed
    console.log('Checking pricing_tiers table...');
    const checkPricingTiersTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pricing_tiers'
      );
    `);

    if (!checkPricingTiersTable.rows[0].exists) {
      console.log('Creating pricing_tiers table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS pricing_tiers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          profile_id UUID NOT NULL REFERENCES pricing_profiles(id) ON DELETE CASCADE,
          data_gb NUMERIC(10, 2) NOT NULL,
          price NUMERIC(10, 2) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('Created pricing_tiers table');
    }

    // 3. Check if user_pricing_profiles table exists and create if needed
    console.log('Checking user_pricing_profiles table...');
    const checkUserPricingProfilesTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_pricing_profiles'
      );
    `);

    if (!checkUserPricingProfilesTable.rows[0].exists) {
      console.log('Creating user_pricing_profiles table...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_pricing_profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          profile_id UUID NOT NULL REFERENCES pricing_profiles(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('Created user_pricing_profiles table');
    }

    // 4. Check if updated_at column exists in user_pricing_profiles
    console.log('Checking updated_at column in user_pricing_profiles table...');
    const checkUpdatedAtColumn = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_pricing_profiles' 
        AND column_name = 'updated_at'
      );
    `);

    if (!checkUpdatedAtColumn.rows[0].exists) {
      console.log('Adding updated_at column to user_pricing_profiles table...');
      await pool.query(`
        ALTER TABLE user_pricing_profiles 
        ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
      `);
      console.log('Successfully added updated_at column to user_pricing_profiles table.');
    } else {
      console.log('Column updated_at already exists in user_pricing_profiles table.');
    }

    // 5. Create compatibility views for all tables to ensure consistent ORM naming
    console.log('Creating backward compatibility views...');
    
    // Check if data_price_per_gb or price_per_gb columns exist
    console.log('Checking pricing column names...');
    const checkDataPriceColumn = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pricing_profiles' 
        AND column_name = 'data_price_per_gb'
      );
    `);
    
    const checkPricePerGBColumn = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pricing_profiles' 
        AND column_name = 'price_per_gb'
      );
    `);
    
    const hasDataPriceColumn = checkDataPriceColumn.rows[0].exists;
    const hasPricePerGBColumn = checkPricePerGBColumn.rows[0].exists;
    
    console.log(`Column data_price_per_gb exists: ${hasDataPriceColumn}`);
    console.log(`Column price_per_gb exists: ${hasPricePerGBColumn}`);
    
    // Add missing price column if needed
    if (!hasDataPriceColumn && !hasPricePerGBColumn) {
      console.log('Adding data_price_per_gb column...');
      await pool.query(`
        ALTER TABLE pricing_profiles 
        ADD COLUMN data_price_per_gb NUMERIC(10, 2);
      `);
    } else if (!hasDataPriceColumn && hasPricePerGBColumn) {
      console.log('Renaming price_per_gb to data_price_per_gb...');
      await pool.query(`
        ALTER TABLE pricing_profiles 
        ADD COLUMN data_price_per_gb NUMERIC(10, 2);
        
        UPDATE pricing_profiles 
        SET data_price_per_gb = price_per_gb;
      `);
    }
    
    // Create pricingProfiles view with proper casing for ORM
    console.log('Creating pricingProfiles view...');
    
    if (hasDataPriceColumn) {
      await pool.query(`
        CREATE OR REPLACE VIEW "pricingProfiles" AS
        SELECT 
          id, 
          name, 
          description, 
          base_price AS "basePrice", 
          data_price_per_gb AS "pricePerGb", 
          is_tiered AS "isTiered", 
          minimum_charge AS "minimumCharge",
          is_active AS "isActive",
          created_at AS "createdAt", 
          updated_at AS "updatedAt"
        FROM pricing_profiles;
      `);
    } else if (hasPricePerGBColumn) {
      await pool.query(`
        CREATE OR REPLACE VIEW "pricingProfiles" AS
        SELECT 
          id, 
          name, 
          description, 
          base_price AS "basePrice", 
          price_per_gb AS "pricePerGb", 
          is_tiered AS "isTiered", 
          minimum_charge AS "minimumCharge",
          is_active AS "isActive",
          created_at AS "createdAt", 
          updated_at AS "updatedAt"
        FROM pricing_profiles;
      `);
    } else {
      await pool.query(`
        CREATE OR REPLACE VIEW "pricingProfiles" AS
        SELECT 
          id, 
          name, 
          description, 
          base_price AS "basePrice", 
          data_price_per_gb AS "pricePerGb", 
          is_tiered AS "isTiered", 
          minimum_charge AS "minimumCharge",
          is_active AS "isActive",
          created_at AS "createdAt", 
          updated_at AS "updatedAt"
        FROM pricing_profiles;
      `);
    }
    
    // Create pricingTiers view with proper casing for ORM
    await pool.query(`
      CREATE OR REPLACE VIEW "pricingTiers" AS
      SELECT 
        id, 
        profile_id AS "profileId", 
        data_gb AS "dataGB", 
        price, 
        created_at AS "createdAt", 
        updated_at AS "updatedAt"
      FROM pricing_tiers;
    `);
    
    // Create userPricingProfiles view with proper casing for ORM
    await pool.query(`
      CREATE OR REPLACE VIEW "userPricingProfiles" AS
      SELECT 
        id, 
        user_id AS "userId", 
        profile_id AS "profileId", 
        created_at AS "createdAt", 
        updated_at AS "updatedAt"
      FROM user_pricing_profiles;
    `);
    
    console.log('Views created successfully.');

    // 6. Check for sample data in pricing_profiles and add if empty
    const checkPricingProfilesData = await pool.query(`
      SELECT COUNT(*) FROM pricing_profiles;
    `);

    if (parseInt(checkPricingProfilesData.rows[0].count) === 0) {
      console.log('Adding sample pricing profiles...');
      
      // Create standard non-tiered profile
      const standardProfileResult = await pool.query(`
        INSERT INTO pricing_profiles (name, description, base_price, price_per_gb, is_tiered)
        VALUES ('Standard', 'Standard formula-based pricing with base price and per GB rate', 10.00, 5.00, false)
        RETURNING id;
      `);
      const standardProfileId = standardProfileResult.rows[0].id;
      console.log(`Created standard profile with ID: ${standardProfileId}`);
      
      // Create tiered profile
      const tieredProfileResult = await pool.query(`
        INSERT INTO pricing_profiles (name, description, is_tiered)
        VALUES ('Premium Tiered', 'Premium tier-based pricing with custom data allocations', true)
        RETURNING id;
      `);
      const tieredProfileId = tieredProfileResult.rows[0].id;
      console.log(`Created tiered profile with ID: ${tieredProfileId}`);
      
      // Add tiers to tiered profile
      await pool.query(`
        INSERT INTO pricing_tiers (profile_id, data_gb, price)
        VALUES
          ('${tieredProfileId}', 1, 15.00),
          ('${tieredProfileId}', 2, 25.00),
          ('${tieredProfileId}', 5, 50.00),
          ('${tieredProfileId}', 10, 90.00),
          ('${tieredProfileId}', 20, 160.00);
      `);
      
      console.log('Sample pricing profiles and tiers created successfully.');
    }

    console.log('Schema fix completed successfully.');
  } catch (error) {
    console.error('Error fixing schema:', error);
  } finally {
    await pool.end();
    console.log('Database connection closed');
  }
}

// Execute the schema fix
fixSchema().catch(error => {
  console.error('Failed to fix schema:', error);
  process.exit(1);
});
