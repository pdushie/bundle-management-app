// Test script for Telegram admin notifications
require('dotenv').config({ path: '.env.local' });

// Check if node-telegram-bot-api is installed
try {
  require.resolve('node-telegram-bot-api');
  console.log('✅ node-telegram-bot-api is installed');
} catch (e) {
  console.error('❌ node-telegram-bot-api is NOT installed. Please run: npm install --save node-telegram-bot-api');
  process.exit(1);
}

// Import our JavaScript implementation of admin notifications
const { sendTelegramNotification } = require('./admin-notifications');

async function testTelegramNotification() {
  console.log('Testing Telegram notification system...');
  console.log('Telegram enabled:', process.env.ENABLE_TELEGRAM_NOTIFICATIONS);
  console.log('Admin Telegram chat IDs:', process.env.TELEGRAM_CHAT_IDS);
  
  // Test if Telegram bot token is set
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('Error: Telegram bot token not configured');
    console.log('Please set TELEGRAM_BOT_TOKEN in .env.local file');
    return { success: false, error: 'Missing Telegram bot token' };
  }
  
  // Get all configured chat IDs
  const chatIds = (process.env.TELEGRAM_CHAT_IDS || '').split(',')
    .map(id => id.trim())
    .filter(id => id);
    
  if (chatIds.length === 0) {
    console.error('Error: No admin Telegram chat IDs configured');
    console.log('Please set TELEGRAM_CHAT_IDS in .env.local file');
    return { success: false, error: 'No admin Telegram chat IDs configured' };
  }
  
  // Create message content with Markdown formatting
  const message = `🧪 *Test Notification*\n\n` +
                  `This is a test notification from the *Bundle Management App*.\n\n` +
                  `If you received this message, Telegram notifications are configured correctly!\n\n` +
                  `Sent at: \`${new Date().toLocaleString()}\``;
  
  // Try each chat ID until one succeeds
  let success = false;
  let lastError = null;
  
  for (let i = 0; i < chatIds.length; i++) {
    const chatId = chatIds[i];
    try {
      console.log(`Sending test Telegram message to chat ID: ${chatId} (${i+1}/${chatIds.length})...`);
      const result = await sendTelegramNotification(message, chatId);
      
      if (result) {
        console.log(`✅ Test Telegram message sent successfully to chat ID: ${chatId}!`);
        success = true;
        break; // Exit loop on success
      } else {
        console.log(`⚠️ Failed to send to chat ID: ${chatId}, trying next if available...`);
      }
    } catch (error) {
      lastError = error;
      console.log(`⚠️ Error with chat ID ${chatId}: ${error.message}`);
      
      // If the error is "chat not found", provide helpful information
      if (error.message && error.message.includes("chat not found")) {
        console.log(`\nThe chat ID ${chatId} was not found. This usually means:`);
        console.log('1. The user has not started a chat with your bot');
        console.log('2. The chat ID is incorrect');
        console.log('\nTo fix this:');
        console.log('1. Make sure the user has started a conversation with your bot');
        console.log('2. To get your correct chat ID, message @userinfobot on Telegram');
        console.log('3. Or check https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates after messaging your bot\n');
      }
    }
  }
  
  if (success) {
    return { success: true };
  } else {
    console.error('❌ Failed to send test Telegram message to any chat ID');
    return { 
      success: false, 
      error: lastError ? lastError.message : 'Failed to send test message to any chat ID' 
    };
  }
}

// Run the test
console.log('Starting Telegram notification test...');

// Debug information
console.log('Debug info:');
console.log('- Node version:', process.version);
console.log('- Bot token present:', !!process.env.TELEGRAM_BOT_TOKEN);
console.log('- Bot token length:', process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.length : 0);
console.log('- Chat IDs present:', !!process.env.TELEGRAM_CHAT_IDS);

testTelegramNotification()
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
    console.error('Error stack:', error.stack);
    process.exit(1);
  });
