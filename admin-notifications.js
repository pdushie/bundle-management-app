// JavaScript implementation of admin notifications for direct usage in Node.js scripts
// This file allows us to test Telegram functionality without requiring TypeScript compilation

/**
 * Send a Telegram notification to admin users or a specific chat
 * @param {string} message - The message content to send (supports Markdown)
 * @param {string} [chatId] - Optional specific chat ID
 * @returns {Promise<boolean>} - Whether the message was sent successfully
 */
async function sendTelegramNotification(message, chatId) {
  try {
    // Check if Telegram bot token is configured
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      console.error('Telegram bot token not configured');
      return false;
    }
    
    // Import Telegram SDK
    const TelegramBot = require('node-telegram-bot-api');
    
    // Create Telegram bot instance (polling should be false in production)
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
    
    // If a specific chat ID is provided, send only to it
    if (chatId) {
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      return true;
    }
    
    // Otherwise, get admin chat IDs from environment
    const chatIds = (process.env.TELEGRAM_CHAT_IDS || '')
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0);
    
    if (process.env.ENABLE_TELEGRAM_NOTIFICATIONS !== 'true' || chatIds.length === 0) {
      console.log('Telegram notifications are disabled or no admin chat IDs configured');
      return false;
    }
    
    // Send to all admin chat IDs in parallel
    await Promise.all(
      chatIds.map(id => 
        bot.sendMessage(id, message, { parse_mode: 'Markdown' })
      )
    );
    
    return true;
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    return false;
  }
}

/**
 * Notify admins about a new order
 * @param {Object} order - The order object
 * @returns {Promise<void>}
 */
async function notifyAdminAboutNewOrder(order) {
  try {
    // Format the message (using Markdown for Telegram)
    const message = `🔔 *New Order Received!*\n\n` +
      `*Order ID:* \`${order.id}\`\n` +
      `*From:* ${order.userName} (${order.userEmail})\n` +
      `*Total Data:* ${order.totalData} GB\n` +
      `*Total Items:* ${order.totalCount}\n` +
      `*Time:* ${new Date(order.timestamp).toLocaleString()}\n\n` +
      `This order requires processing.`;
    
    // Send Telegram notification if enabled
    if (process.env.ENABLE_TELEGRAM_NOTIFICATIONS === 'true') {
      await sendTelegramNotification(message);
    }
    
    console.log('Admin notifications sent for new order:', order.id);
  } catch (error) {
    console.error('Failed to notify admin about new order:', error);
  }
}

// Export functions for use in test scripts
module.exports = {
  sendTelegramNotification,
  notifyAdminAboutNewOrder
};
