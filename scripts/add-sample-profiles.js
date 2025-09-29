// Add a sample pricing profile
const { Client } = require('pg');
require('dotenv').config();

async function addSampleProfile() {
  console.log('Adding sample pricing profile...');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // First check if any profiles exist
    const checkQuery = 'SELECT COUNT(*) FROM pricing_profiles;';
    const checkResult = await client.query(checkQuery);
    
    if (parseInt(checkResult.rows[0].count) > 0) {
      console.log('Profiles already exist. Skipping sample profile creation.');
      return;
    }

    // Insert formula-based profile
    const formulaQuery = `
      INSERT INTO pricing_profiles 
        (name, description, base_price, data_price_per_gb, minimum_charge, is_active, is_tiered) 
      VALUES 
        ('Standard', 'Standard formula-based pricing', 10.00, 5.00, 10.00, true, false)
      RETURNING id;
    `;
    
    const formulaResult = await client.query(formulaQuery);
    console.log(`Created formula-based profile with ID: ${formulaResult.rows[0].id}`);

    // Insert tiered profile
    const tieredQuery = `
      INSERT INTO pricing_profiles 
        (name, description, base_price, data_price_per_gb, minimum_charge, is_active, is_tiered) 
      VALUES 
        ('Premium Tiered', 'Premium tier-based pricing with custom data allocations', 10.00, null, 10.00, true, true)
      RETURNING id;
    `;
    
    const tieredResult = await client.query(tieredQuery);
    const tieredProfileId = tieredResult.rows[0].id;
    console.log(`Created tiered profile with ID: ${tieredProfileId}`);

    // Insert tiers for the tiered profile
    const tiersQuery = `
      INSERT INTO pricing_tiers (profile_id, data_gb, price) VALUES
        (${tieredProfileId}, 1, 15.00),
        (${tieredProfileId}, 2, 25.00),
        (${tieredProfileId}, 5, 50.00),
        (${tieredProfileId}, 10, 90.00);
    `;
    
    await client.query(tiersQuery);
    console.log('Added pricing tiers for the tiered profile');
    
    console.log('Sample pricing profiles created successfully');
  } catch (error) {
    console.error('Error adding sample profile:', error);
  } finally {
    await client.end();
  }
}

addSampleProfile();
