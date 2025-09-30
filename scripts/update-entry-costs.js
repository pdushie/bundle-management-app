/**
 * Script to add entry costs to existing orders
 * This script calculates costs for each entry in all orders
 * using the tier pricing structure
 */

const { db } = require('../src/lib/db');
const { pricingProfiles, pricingTiers, orders, orderEntries } = require('../src/lib/schema');
const { getUserPricingProfile } = require('../src/lib/pricingUtils');
const { calculateEntryCost, calculateEntryCosts } = require('../src/lib/entryCostCalculator');
const { eq } = require('drizzle-orm');

async function updateOrderEntryCosts() {
  try {
    console.log('Starting to update order entry costs with strict tier pricing...');
    
    // Get all orders
    const allOrders = await db.query.orders.findMany({
      with: {
        entries: true
      }
    });
    console.log(`Found ${allOrders.length} orders to process`);
    
    // Process each order
    let updatedCount = 0;
    let totalEntryCount = 0;
    
    for (const order of allOrders) {
      try {
        console.log(`\nProcessing order ${order.id}`);
        
        // Get the user's pricing profile
        const userId = order.userId || 0;
        const userPricingProfile = await getUserPricingProfile(userId);
        
        // Get pricing tiers if the profile is tiered
        let tiers = [];
        if (userPricingProfile.isTiered) {
          tiers = await db.select().from(pricingTiers)
            .where(eq(pricingTiers.profileId, userPricingProfile.id));
          
          console.log(`Using tier pricing profile: ${userPricingProfile.name}`);
          console.log(`Found ${tiers.length} pricing tiers`);
          tiers.forEach(tier => {
            console.log(`  - Tier ${tier.dataGB}GB: GHS ${tier.price}`);
          });
        }
        
        // Get the entries for this order
        let entries = order.entries;
        if (!entries || entries.length === 0) {
          console.log(`No entries found for order ${order.id}`);
          continue;
        }
        
        console.log(`Found ${entries.length} entries to process`);
        
        // Calculate total order cost based on entry costs
        let orderTotalCost = 0;
        
        // Update each entry with the correct tier-based cost
        for (const entry of entries) {
          const allocationGB = parseFloat(entry.allocationGB);
          const entryCost = calculateEntryCost(allocationGB, userPricingProfile, tiers);
          
          console.log(`Entry ${entry.id}: ${entry.number} - ${allocationGB}GB = GHS ${entryCost} (was: GHS ${entry.cost || 'N/A'})`);
          
          // Update the entry in the database
          await db.execute(
            `UPDATE order_entries SET cost = $1 WHERE id = $2`,
            [entryCost.toString(), entry.id]
          );
          
          orderTotalCost += entryCost;
          totalEntryCount++;
        }
        
        // Update the order's total cost
        console.log(`Updating order ${order.id} total cost to GHS ${orderTotalCost.toFixed(2)} (was: GHS ${order.cost || 'N/A'})`);
        await db.update(orders)
          .set({ 
            cost: orderTotalCost.toString(),
            estimatedCost: orderTotalCost.toString()
          })
          .where(eq(orders.id, order.id));
        
        updatedCount++;
        
        // Log progress every 5 orders
        if (updatedCount % 5 === 0) {
          console.log(`\nProgress: Processed ${updatedCount} orders so far (${totalEntryCount} entries)`);
        }
      } catch (orderError) {
        console.error(`Error processing order ${order.id}:`, orderError);
      }
    }
    
    console.log(`\nUpdate complete!`);
    console.log(`Successfully updated ${updatedCount} out of ${allOrders.length} orders`);
    console.log(`Updated ${totalEntryCount} entries with strict tier-based pricing`);
  } catch (error) {
    console.error('Error updating order entry costs:', error);
  } finally {
    // Close any open connections
    console.log('\nExiting...');
    process.exit(0);
  }
}

// Run the update
updateOrderEntryCosts();
