import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function debugPricingProfiles() {
  try {
    console.log('Checking pricing profiles in database...');
    
    // Get all pricing profiles
    const profiles = await sql`
      SELECT id, name, description, base_price, data_price_per_gb, minimum_charge, is_active, is_tiered, created_at, updated_at
      FROM pricing_profiles
      ORDER BY id
    `;
    
    console.log(`Found ${profiles.length} pricing profiles:`);
    
    profiles.forEach((profile, index) => {
      console.log(`\nProfile ${index + 1}:`);
      console.log(`  ID: ${profile.id}`);
      console.log(`  Name: ${profile.name}`);
      console.log(`  Description: ${profile.description}`);
      console.log(`  Base Price: ${profile.base_price}`);
      console.log(`  Data Price per GB: ${profile.data_price_per_gb}`);
      console.log(`  Minimum Charge: ${profile.minimum_charge}`);
      console.log(`  Is Active: ${profile.is_active}`);
      console.log(`  Is Tiered: ${profile.is_tiered}`);
      console.log(`  Created At: ${profile.created_at}`);
      console.log(`  Updated At: ${profile.updated_at}`);
      
      // Check for null or undefined required fields
      if (!profile.id) console.log('  ❌ Missing ID');
      if (!profile.name) console.log('  ❌ Missing Name');
    });
    
    // Also check pricing tiers
    const tiers = await sql`
      SELECT pt.id, pt.profile_id, pt.data_gb, pt.price, pp.name as profile_name
      FROM pricing_tiers pt
      LEFT JOIN pricing_profiles pp ON pt.profile_id = pp.id
      ORDER BY pt.profile_id, pt.data_gb
    `;
    
    console.log(`\nFound ${tiers.length} pricing tiers:`);
    
    tiers.forEach((tier, index) => {
      console.log(`\nTier ${index + 1}:`);
      console.log(`  ID: ${tier.id}`);
      console.log(`  Profile ID: ${tier.profile_id}`);
      console.log(`  Profile Name: ${tier.profile_name || 'MISSING PROFILE'}`);
      console.log(`  Data GB: ${tier.data_gb}`);
      console.log(`  Price: ${tier.price}`);
      
      if (!tier.profile_name) {
        console.log('  ❌ Orphaned tier - profile does not exist!');
      }
    });
    
  } catch (error) {
    console.error('Error debugging pricing profiles:', error);
  }
}

debugPricingProfiles();