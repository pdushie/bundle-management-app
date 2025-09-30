/**
 * Script to update entry costs in all orders based on tier pricing
 */
const { db, neonClient } = require('../src/lib/db');
const { calculateEntryCost } = require('../src/lib/entryCostCalculator');

async function updateAllOrderEntryCosts() {
  try {
    console.log('Starting to update all order entry costs using tier pricing...');

    // Get all orders from the database
    const orders = await neonClient`
      SELECT o.id, o.user_id, o.total_data, o.cost, o.pricing_profile_id,
             p.name AS pricing_profile_name, p.base_price, p.data_price_per_gb, 
             p.minimum_charge, p.is_tiered
      FROM orders o
      LEFT JOIN pricing_profiles p ON o.pricing_profile_id = p.id
    `;
    
    console.log(`Found ${orders.length} orders to process`);

    // Process each order
    for (const order of orders) {
      try {
        console.log(`Processing order ${order.id}`);

        // Get the pricing tiers for this profile if it's tiered
        let tiers = [];
        if (order.is_tiered) {
          tiers = await neonClient`
            SELECT id, profile_id, data_gb, price
            FROM pricing_tiers
            WHERE profile_id = ${order.pricing_profile_id}
            ORDER BY data_gb
          `;
        }

        // Get the entries for this order
        const entries = await neonClient`
          SELECT id, number, allocation_gb
          FROM order_entries
          WHERE order_id = ${order.id}
        `;

        console.log(`  Found ${entries.length} entries`);

        // Create profile object for cost calculation
        const profile = {
          id: order.pricing_profile_id,
          name: order.pricing_profile_name,
          basePrice: order.base_price,
          dataPricePerGB: order.data_price_per_gb,
          minimumCharge: order.minimum_charge,
          isActive: true,
          isTiered: order.is_tiered
        };

        // Update each entry with tier-based cost
        for (const entry of entries) {
          try {
            const entryCost = calculateEntryCost(
              parseFloat(entry.allocation_gb),
              profile,
              tiers.map(tier => ({
                profileId: tier.profile_id,
                dataGB: tier.data_gb,
                price: tier.price
              }))
            );

            // Update the entry with the calculated cost
            await neonClient`
              UPDATE order_entries
              SET cost = ${entryCost.toString()}
              WHERE id = ${entry.id}
            `;

            console.log(`  Updated entry ${entry.id} with cost ${entryCost}`);
          } catch (entryError) {
            console.error(`  Error updating entry ${entry.id}:`, entryError);
          }
        }

        console.log(`Completed processing order ${order.id}`);
      } catch (orderError) {
        console.error(`Error processing order ${order.id}:`, orderError);
      }
    }

    console.log('All order entry costs have been updated with tier-based pricing!');
  } catch (error) {
    console.error('Error updating order entry costs:', error);
  } finally {
    process.exit(0);
  }
}

// Run the update
updateAllOrderEntryCosts();
