// Comprehensive check of pricing system tables and data
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkPricingSystem() {
  console.log('✨ Checking pricing system tables and data...');
  
  // Create a new pool using the same connection string as the app
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
  });
  
  try {
    console.log('Connected to database');
    
    // Check if required tables exist
    console.log('\n📊 CHECKING DATABASE TABLES:');
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('pricing_profiles', 'pricing_tiers', 'user_pricing_profiles');
    `;
    const tablesResult = await pool.query(tablesQuery);
    const existingTables = tablesResult.rows.map(row => row.table_name);
    
    const requiredTables = ['pricing_profiles', 'pricing_tiers', 'user_pricing_profiles'];
    let missingTables = [];
    
    requiredTables.forEach(table => {
      if (existingTables.includes(table)) {
        console.log(`✅ Table ${table} exists`);
      } else {
        console.log(`❌ Table ${table} is MISSING`);
        missingTables.push(table);
      }
    });
    
    if (missingTables.length > 0) {
      console.log('\n⚠️ Some required tables are missing. Run the following to fix:');
      console.log('node scripts/fix-schema.js');
      return;
    }
    
    // Check pricing columns
    console.log('\n� CHECKING PRICING COLUMN STRUCTURE:');
    
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
    
    console.log(`- data_price_per_gb column: ${hasDataPriceColumn ? '✅ Present' : '❌ Missing'}`);
    console.log(`- price_per_gb column: ${hasPricePerGBColumn ? '✅ Present' : '❌ Missing'}`);
    
    // Check pricing profiles
    console.log('\n📝 PRICING PROFILES:');
    
    let priceColumnQuery;
    if (hasDataPriceColumn && hasPricePerGBColumn) {
      priceColumnQuery = "COALESCE(data_price_per_gb, price_per_gb) AS price_per_gb";
    } else if (hasDataPriceColumn) {
      priceColumnQuery = "data_price_per_gb AS price_per_gb";
    } else if (hasPricePerGBColumn) {
      priceColumnQuery = "price_per_gb";
    } else {
      priceColumnQuery = "NULL AS price_per_gb";
    }
    
    const profilesQuery = `
      SELECT id, name, description, base_price, 
             ${priceColumnQuery}, 
             is_tiered, minimum_charge, is_active,
             created_at, updated_at 
      FROM pricing_profiles 
      ORDER BY name
    `;
    
    const profilesResult = await pool.query(profilesQuery);
    
    if (profilesResult.rows.length === 0) {
      console.log('No pricing profiles found. Run scripts/fix-schema.js to create sample data.');
    } else {
      console.log(`Found ${profilesResult.rows.length} pricing profiles:`);
      profilesResult.rows.forEach(profile => {
        console.log(`- ${profile.name} (${profile.id}):`);
        console.log(`  Description: ${profile.description || 'N/A'}`);
        console.log(`  Tiered: ${profile.is_tiered ? 'Yes' : 'No'}`);
        if (!profile.is_tiered) {
          console.log(`  Base Price: GHS ${profile.base_price}`);
          console.log(`  Price Per GB: GHS ${profile.price_per_gb}`);
        }
        console.log(`  Created: ${profile.created_at}`);
      });
    }
    
    // Check pricing tiers
    console.log('\n📈 PRICING TIERS:');
    const tiersResult = await pool.query(`
      SELECT t.id, t.profile_id, p.name as profile_name, t.data_gb, t.price, t.created_at
      FROM pricing_tiers t
      JOIN pricing_profiles p ON t.profile_id = p.id
      ORDER BY p.name, t.data_gb
    `);
    
    if (tiersResult.rows.length === 0) {
      console.log('No pricing tiers found.');
    } else {
      // Group by profile
      const tiersByProfile = {};
      tiersResult.rows.forEach(tier => {
        if (!tiersByProfile[tier.profile_name]) {
          tiersByProfile[tier.profile_name] = [];
        }
        tiersByProfile[tier.profile_name].push(tier);
      });
      
      // Display tiers by profile
      Object.keys(tiersByProfile).forEach(profileName => {
        console.log(`\nTiers for "${profileName}":`);
        console.log('| Data (GB) | Price (GHS) |');
        console.log('|-----------|------------|');
        tiersByProfile[profileName].forEach(tier => {
          console.log(`| ${tier.data_gb.toString().padEnd(9)} | ${tier.price.toString().padEnd(10)} |`);
        });
      });
    }
    
    // Check compatibility views
    console.log('\n🔍 DATABASE VIEWS:');
    const viewsResult = await pool.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public' AND table_name IN ('pricingProfiles', 'pricingTiers', 'userPricingProfiles');
    `);
    
    const views = viewsResult.rows.map(row => row.table_name);
    console.log('Compatibility views:');
    ['pricingProfiles', 'pricingTiers', 'userPricingProfiles'].forEach(viewName => {
      console.log(`- ${viewName}: ${views.includes(viewName) ? '✅ Present' : '❌ Missing'}`);
    });
    
    if (views.length < 3) {
      console.log('\n⚠️ Some compatibility views are missing. Run scripts/fix-schema.js to create them.');
    }
    
    // Check schema structure
    console.log('\n🔧 CHECKING SCHEMA STRUCTURE:');
    
    // Check if updated_at exists in user_pricing_profiles
    const updatedAtCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_pricing_profiles' 
        AND column_name = 'updated_at'
      );
    `);
    
    console.log(`- updated_at in user_pricing_profiles: ${updatedAtCheck.rows[0].exists ? '✅ Present' : '❌ Missing'}`);
    
    // Check if is_tiered exists in pricing_profiles
    const isTieredCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pricing_profiles' 
        AND column_name = 'is_tiered'
      );
    `);
    
    console.log(`- is_tiered in pricing_profiles: ${isTieredCheck.rows[0].exists ? '✅ Present' : '❌ Missing'}`);
    
    // Final status report
    console.log('\n📋 STATUS SUMMARY:');
    
    const hasAllTables = missingTables.length === 0;
    const hasAllViews = views.length === 3;
    const hasUpdatedAt = updatedAtCheck.rows[0].exists;
    const hasIsTiered = isTieredCheck.rows[0].exists;
    const hasProfiles = profilesResult.rows.length > 0;
    
    if (hasAllTables && hasAllViews && hasUpdatedAt && hasIsTiered) {
      console.log('✅ Pricing system schema is properly configured.');
      
      if (!hasProfiles) {
        console.log('⚠️ No pricing profiles found. Run scripts/fix-schema.js to create sample data.');
      } else {
        console.log('✅ Pricing profiles data is available.');
      }
    } else {
      console.log('❌ Pricing system schema has issues that need to be fixed.');
      console.log('Run the following to fix schema issues:');
      console.log('node scripts/fix-schema.js');
    }
    
  } catch (error) {
    console.error('Error checking pricing system:', error);
  } finally {
    await pool.end();
    console.log('\nDatabase connection closed');
  }
}

// Execute the check
checkPricingSystem().catch(error => {
  console.error('Failed to check pricing system:', error);
  process.exit(1);
});
