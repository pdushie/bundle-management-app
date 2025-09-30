/**
 * Browser-based script to fix tier pricing in My Sent Orders
 * 
 * HOW TO USE:
 * 1. Log in as an admin
 * 2. Open your browser's developer tools (F12 or Right-click > Inspect)
 * 3. Go to the Console tab
 * 4. Copy and paste this entire script into the console
 * 5. Press Enter to run it
 * 
 * ALTERNATIVE:
 * Instead of using this script, you can navigate to /admin/update-entry-costs
 * in your browser while logged in as an admin, which provides a user-friendly
 * interface for the same functionality.
 */

async function updateAllOrderEntryPrices() {
  // Create visual indicator that the script is running
  const notifyElement = document.createElement('div');
  notifyElement.style = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 9999;
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 400px;
  `;
  notifyElement.innerHTML = `
    <div style="display: flex; align-items: center; margin-bottom: 10px;">
      <div style="
        border: 3px solid #ffffff;
        border-top: 3px solid #3498db;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        margin-right: 12px;
        animation: spin 1s linear infinite;
      "></div>
      <div style="font-weight: bold;">Updating Order Pricing</div>
    </div>
    <div id="update-status">Starting price update process...</div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
  document.body.appendChild(notifyElement);
  
  function updateStatus(message) {
    console.log(message);
    const statusElement = document.getElementById('update-status');
    if (statusElement) {
      statusElement.textContent = message;
    }
  }
  
  try {
    updateStatus('Checking authentication and permissions...');
    
    // Check if user is admin first
    const sessionResponse = await fetch('/api/auth/session');
    const session = await sessionResponse.json();
    
    if (!session.user?.isAdmin) {
      throw new Error('You must be logged in as an admin to update pricing');
    }
    
    updateStatus('Getting pricing profiles and tiers...');
    
    // Get all pricing profiles to analyze the tier structure
    const profilesResponse = await fetch('/api/admin/pricing-profiles');
    const profilesData = await profilesResponse.json();
    
    console.log('Available pricing profiles:', profilesData);
    
    // Make the API call to update all orders
    updateStatus('Sending update request to server...');
    
    const response = await fetch('/api/admin/update-entry-costs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    console.log('API Response:', result);
    
    if (result.success) {
      updateStatus(`✓ Success! Updated ${result.updatedCount} orders with ${result.totalEntryCount} entries.`);
      
      // Update styling to success
      notifyElement.querySelector('div:first-child div:first-child').style.borderTop = '3px solid #2ecc71';
      notifyElement.querySelector('div:first-child div:first-child').style.animation = 'none';
      notifyElement.style.background = 'rgba(46, 204, 113, 0.9)';
      
      // Add reload button
      const reloadButton = document.createElement('button');
      reloadButton.textContent = 'Reload Page to See Changes';
      reloadButton.style = `
        background: white;
        color: #2ecc71;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        margin-top: 10px;
        cursor: pointer;
        font-weight: bold;
      `;
      reloadButton.onclick = () => window.location.reload();
      notifyElement.appendChild(reloadButton);
      
      // Auto-remove notification after 30 seconds
      setTimeout(() => {
        notifyElement.style.opacity = '0';
        notifyElement.style.transition = 'opacity 0.5s ease-out';
        setTimeout(() => notifyElement.remove(), 500);
      }, 30000);
    } else {
      throw new Error(result.error || 'Unknown error occurred');
    }
  } catch (error) {
    console.error('Error updating prices:', error);
    
    // Update styling to error
    notifyElement.querySelector('div:first-child div:first-child').style.borderTop = '3px solid #e74c3c';
    notifyElement.querySelector('div:first-child div:first-child').style.animation = 'none';
    notifyElement.style.background = 'rgba(231, 76, 60, 0.9)';
    
    // Update error message
    updateStatus(`Error: ${error.message}`);
    
    // Add dismiss button
    const dismissButton = document.createElement('button');
    dismissButton.textContent = 'Dismiss';
    dismissButton.style = `
      background: white;
      color: #e74c3c;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      margin-top: 10px;
      cursor: pointer;
      font-weight: bold;
    `;
    dismissButton.onclick = () => notifyElement.remove();
    notifyElement.appendChild(dismissButton);
  }
}

// Run the function
updateAllOrderEntryPrices();
