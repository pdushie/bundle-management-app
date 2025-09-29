// Test script for admin notifications
require('dotenv').config({ path: '.env.local' });
// Import our JavaScript implementation of admin notifications
const { sendWhatsAppNotification } = require('./admin-notifications');

async function testWhatsAppNotification() {
  console.log('Testing WhatsApp notification system...');
  console.log('WhatsApp enabled:', process.env.ENABLE_WHATSAPP_NOTIFICATIONS);
  console.log('Admin WhatsApp numbers:', process.env.ADMIN_WHATSAPP_NUMBERS);
  
  // Test if Twilio credentials are set
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_FROM) {
    console.error('Error: Twilio credentials not configured properly');
    console.log('Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM in .env.local file');
    return { success: false, error: 'Missing Twilio credentials' };
  }
  
  // Target number (first one if multiple are configured)
  const adminNumbers = (process.env.ADMIN_WHATSAPP_NUMBERS || '').split(',')
    .map(n => n.trim())
    .filter(n => n);
    
  const targetNumber = adminNumbers[0];
  
  if (!targetNumber) {
    console.error('Error: No admin WhatsApp numbers configured');
    console.log('Please set ADMIN_WHATSAPP_NUMBERS in .env.local file');
    return { success: false, error: 'No admin WhatsApp numbers configured' };
  }
  
  // Send a test WhatsApp message
  try {
    // Create message content
    const message = '🧪 This is a test notification from the Bundle Management App.\n\n' +
                    'If you received this message, WhatsApp notifications are configured correctly!\n\n' +
                    `Sent at: ${new Date().toLocaleString()}`;
    
    console.log(`Sending test WhatsApp message to ${targetNumber}...`);
    const result = await sendWhatsAppNotification(message, targetNumber);
    
    console.log('✅ Test WhatsApp message sent successfully!');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send test WhatsApp message:', error.message);
    if (error.code === 21608) {
      console.error('Note: You might need to first join the Twilio WhatsApp sandbox. Check your Twilio console for instructions.');
    }
    return { success: false, error: error.message };
  }
}

// Run the test
testWhatsAppNotification()
  .then(result => {
    console.log('\nTest result:', result.success ? 'SUCCESS' : 'FAILED');
    if (!result.success) {
      console.error('Error:', result.error);
      process.exit(1);
    }
    console.log('Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unexpected error during test:', error);
    process.exit(1);
  });
