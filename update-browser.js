// This script will be run in the browser console to update all order entries with tier-based pricing
// Copy and paste into your browser console while logged in as an admin

async function updateOrderEntryCosts() {
  console.log('Starting to update all order entries with tier-based pricing...');
  
  try {
    // Call the API endpoint to update all order entries
    const response = await fetch('/api/admin/update-entry-costs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log('API Response:', result);
    
    if (result.success) {
      console.log('Successfully updated all order entries with tier-based pricing!');
      alert('Successfully updated all order entries with tier-based pricing!');
    } else {
      console.error('Failed to update order entries:', result.error);
      alert('Failed to update order entries. Check console for details.');
    }
  } catch (error) {
    console.error('Error updating order entries:', error);
    alert('Error updating order entries. Check console for details.');
  }
}

// Execute the function
updateOrderEntryCosts();
