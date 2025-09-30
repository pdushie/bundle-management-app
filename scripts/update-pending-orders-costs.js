/**
 * This migration script will update orders that are pending with estimated costs
 * based on their pricing profile data
 */

const { neonClient, db } = require('../src/lib/db');

async function updatePendingOrdersWithEstimatedCosts() {
  try {
    console.log('Starting update of pending orders with estimated costs...');
    
    // Get all pending orders that have no estimated cost
    const pendingOrders = await neonClient`
      SELECT o.id, o.total_data, o.user_id, upp.profile_id 
      FROM orders o
      LEFT JOIN user_pricing_profiles upp ON o.user_id = upp.user_id
      WHERE o.status = 'pending' 
      AND (o.estimated_cost IS NULL OR o.estimated_cost = '') 
      ORDER BY o.timestamp DESC
    `;
    
    console.log(`Found ${pendingOrders.length} pending orders with no estimated cost`);
    
    for (const order of pendingOrders) {
      if (!order.profile_id) {
        console.log(`Order ${order.id} has no pricing profile, skipping`);
        continue;
      }
      
      // Get pricing profile details
      const profileDetails = await neonClient`
        SELECT * FROM pricing_profiles WHERE id = ${order.profile_id}
      `;
      
      if (profileDetails.length === 0) {
        console.log(`No pricing profile found for order ${order.id} (profile_id: ${order.profile_id}), skipping`);
        continue;
      }
      
      const profile = profileDetails[0];
      console.log(`Processing order ${order.id} with profile ${profile.name}`);
      
      let estimatedCost = 0;
      
      if (profile.is_tiered) {
        // Get tiers for this profile
        const tiers = await neonClient`
          SELECT * FROM pricing_tiers 
          WHERE profile_id = ${profile.id} 
          ORDER BY data_gb ASC
        `;
        
        console.log(`Found ${tiers.length} pricing tiers for profile ${profile.id}`);
        
        // Calculate based on tiers
        let remainingData = parseFloat(order.total_data);
        estimatedCost = parseFloat(profile.base_price);
        
        // Apply tier pricing
        for (const tier of tiers) {
          const tierData = parseFloat(tier.data_gb);
          const tierPrice = parseFloat(tier.price);
          
          if (remainingData <= 0) break;
          
          // Calculate how much data to charge at this tier
          const dataToCharge = Math.min(remainingData, tierData);
          const tierCost = dataToCharge * tierPrice;
          
          console.log(`  - Tier ${tierData}GB: Using ${dataToCharge}GB at ${tierPrice}/GB = ${tierCost}`);
          
          estimatedCost += tierCost;
          remainingData -= dataToCharge;
        }
      } else {
        // Simple base price + per GB pricing
        const basePrice = parseFloat(profile.base_price);
        const perGBPrice = parseFloat(profile.data_price_per_gb || 0);
        const totalData = parseFloat(order.total_data);
        
        estimatedCost = basePrice + (totalData * perGBPrice);
        console.log(`  - Simple pricing: ${basePrice} + (${totalData} * ${perGBPrice}) = ${estimatedCost}`);
      }
      
      // Apply minimum charge if necessary
      const minimumCharge = parseFloat(profile.minimum_charge || 0);
      if (estimatedCost < minimumCharge) {
        console.log(`  - Applied minimum charge: ${minimumCharge} (was ${estimatedCost})`);
        estimatedCost = minimumCharge;
      }
      
      // Round to 2 decimal places
      estimatedCost = Math.round(estimatedCost * 100) / 100;
      
      // Update the order with estimated cost
      console.log(`  - Updating order ${order.id} with estimated cost ${estimatedCost}`);
      await neonClient`
        UPDATE orders 
        SET estimated_cost = ${estimatedCost.toString()},
            pricing_profile_name = ${profile.name}
        WHERE id = ${order.id}
      `;
    }
    
    console.log('Finished updating pending orders with estimated costs');
  } catch (error) {
    console.error('Error updating pending orders with estimated costs:', error);
  }
}

// Run the migration
updatePendingOrdersWithEstimatedCosts().then(() => {
  console.log('Migration completed');
}).catch(error => {
  console.error('Migration failed:', error);
});
