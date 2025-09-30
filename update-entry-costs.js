// Simple script to trigger the update-entry-costs API endpoint
// This will recalculate all entry costs based on tier pricing

const fetch = require('node-fetch');

async function updateEntryCosts() {
  try {
    console.log('Calling the update-entry-costs API to update all order entries with tier pricing...');
    
    const response = await fetch('http://localhost:3000/api/admin/update-entry-costs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    console.log('API Response:', result);
    
    if (result.success) {
      console.log('Successfully updated order entries with tier-based pricing!');
      console.log(`${result.updatedCount || 'All'} orders processed`);
    } else {
      console.error('Failed to update entry costs:', result.error || 'Unknown error');
    }
  } catch (error) {
    console.error('Error calling the update API:', error);
  }
}

updateEntryCosts();
