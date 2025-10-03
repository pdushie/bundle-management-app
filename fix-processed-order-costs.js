import { neonClient } from './src/lib/db.ts';

async function fixProcessedOrderCosts() {
  console.log('Starting to fix processed order costs...');
  
  try {
    // Get all processed orders with zero costs
    const processedOrders = await neonClient`
      SELECT id, cost, estimated_cost, total_data 
      FROM orders 
      WHERE status = 'processed' AND (cost = '0.00' OR cost = '0' OR cost IS NULL OR estimated_cost = '0.00' OR estimated_cost = '0' OR estimated_cost IS NULL)
    `;
    
    console.log(`Found ${processedOrders.length} processed orders with zero costs`);
    
    for (const order of processedOrders) {
      console.log(`\nFixing order ${order.id}:`);
      console.log(`  Current cost: ${order.cost}, estimatedCost: ${order.estimated_cost}`);
      console.log(`  Total data: ${order.total_data}GB`);
      
      // Simple calculation based on data amount
      // Using the standard tier pricing: ~4 GHS per GB for small amounts
      const totalData = parseFloat(order.total_data);
      const calculatedCost = totalData * 4; // 4 GHS per GB as seen in logs
      
      console.log(`  Calculated cost: ${calculatedCost} GHS`);
      
      // Update the order costs
      await neonClient`
        UPDATE orders 
        SET cost = ${calculatedCost.toString()}, 
            estimated_cost = ${calculatedCost.toString()} 
        WHERE id = ${order.id}
      `;
      
      console.log(`  ✅ Updated order ${order.id} with cost: ${calculatedCost}`);
    }
    
    console.log(`\n🎉 Successfully fixed ${processedOrders.length} processed orders!`);
    
  } catch (error) {
    console.error('Error fixing processed order costs:', error);
  }
}

fixProcessedOrderCosts();