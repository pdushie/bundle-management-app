# Instructions for Updating Order Entry Costs with Tier Pricing

This document provides instructions on how to update all existing order entries with the correct tier-based pricing.

## Background

The "Send Order" feature correctly uses tier pricing tied to the user's assigned pricing profile. However, the "My Sent Orders" section may display different pricing values for some orders. This happens because older orders might have been calculated using a different pricing method before the tier pricing system was fully implemented.

## Option 1: Use the Update Tool (Admin Only)

1. Log in as an admin user
2. Visit this URL: http://localhost:3000/update-entry-costs.html
3. Click the "Update Entry Costs" button
4. You will see the results of the update on the page

## Option 2: Direct API Access (Admin Only)

1. Log in as an admin user
2. Visit this URL: http://localhost:3000/api/admin/update-entry-costs
3. You should see a JSON response indicating success and the number of orders updated

## Option 2: Using the Browser Console (Admin Only)

1. Log in as an admin user
2. Open your browser's developer tools (F12 or right-click > Inspect)
3. Navigate to the Console tab
4. Copy and paste the following code into the console:

```javascript
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
```

5. Press Enter to run the code
6. Check the console output for results

## Verification

After running either update method:

1. Go to "My Sent Orders" section
2. Verify that the entry costs displayed match the tier pricing structure
3. Each entry should have its cost calculated based on the tier pricing that's tied to the user's pricing profile
