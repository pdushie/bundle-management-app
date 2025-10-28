import { Order } from './orderDbOperations';

// Interface for admin notification configuration
export interface AdminNotificationConfig {
  // Telegram configuration
  telegramEnabled: boolean;
  telegramChatIds: string[]; // Admin Telegram chat IDs
  
  // Email configuration
  emailEnabled: boolean;
  adminEmails: string[];
  
  // Other notification channels can be added here in the future
}

// Load admin notification configuration from environment variables
export function getAdminNotificationConfig(): AdminNotificationConfig {
  return {
    telegramEnabled: process.env.ENABLE_TELEGRAM_NOTIFICATIONS === 'true',
    telegramChatIds: (process.env.TELEGRAM_CHAT_IDS || '')
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0),
    
    emailEnabled: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
    adminEmails: (process.env.ADMIN_EMAIL_ADDRESSES || '')
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0)
  };
}

// Function to send Telegram notifications to admin users
export async function sendTelegramNotification(
  message: string, 
  chatId?: string
): Promise<boolean> {
  try {
    // Check if Telegram bot token is configured
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      // Console statement removed for security
      return false;
    }
    
    // Import Telegram SDK dynamically to avoid issues in client components
    const TelegramBot = require('node-telegram-bot-api');
    
    // Create Telegram bot instance (polling should be false in production)
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
    
    // If a specific chat ID is provided, send only to it
    if (chatId) {
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      return true;
    }
    
    // Otherwise, get admin chat IDs from configuration
    const config = getAdminNotificationConfig();
    
    if (!config.telegramEnabled || config.telegramChatIds.length === 0) {
      // Console log removed for security
      return false;
    }
    
    // Send to all admin chat IDs in parallel
    await Promise.all(
      config.telegramChatIds.map(chatId => 
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
      )
    );
    
    return true;
  } catch (error) {
    // Console statement removed for security
    return false;
  }
}

// Get a reliable bell emoji for Telegram messages
function getBellEmoji(): string {
  try {
    // Try Unicode escape sequence first (most reliable)
    return '\u{1F514}';
  } catch (error) {
    // Fallback to alternative symbols if Unicode fails
    return '🔔'; // Direct fallback
  }
}

// Function to notify admins about new orders
export async function notifyAdminAboutNewOrder(order: Order): Promise<void> {
  try {
    const config = getAdminNotificationConfig();
    
    // Format the message (using Markdown for Telegram)
    const bellIcon = getBellEmoji();
    const message = `${bellIcon} *New Order Received!*\n\n` +
      `*Order ID:* \`${order.id}\`\n` +
      `*From:* ${order.userName} (${order.userEmail})\n` +
      `*Total Data:* ${order.totalData} GB\n` +
      `*Total Items:* ${order.totalCount}\n` +
      `*Time:* ${new Date(order.timestamp).toLocaleString()}\n\n` +
      `This order requires processing.`;
    
    // Send Telegram notification if enabled
    if (config.telegramEnabled && config.telegramChatIds.length > 0) {
      await sendTelegramNotification(message);
    }
    
    // Email notifications could be implemented here in the future
    // if (config.emailEnabled && config.adminEmails.length > 0) {
    //   await sendEmailNotification(message, config.adminEmails);
    // }
    
    // Console log removed for security
  } catch (error) {
    // Console statement removed for security
  }
}


