// Script to verify and initialize Telegram bot configuration
require('dotenv').config({ path: '.env.local' });
const TelegramBot = require('node-telegram-bot-api');

// Validate environment
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN is not configured in .env.local');
  console.log('Please set up your bot token before running this script.');
  process.exit(1);
}

// Initialize the bot with polling enabled to receive messages
const botToken = process.env.TELEGRAM_BOT_TOKEN;
console.log(`🤖 Initializing bot with token: ${botToken.substring(0, 10)}...`);

// Extract bot username from token (first part)
const botUsername = botToken.split(':')[0];
console.log(`📱 Your bot ID appears to be: ${botUsername}`);

// Create the initialization message
console.log('\n=== TELEGRAM BOT INITIALIZATION ===');
console.log('To set up your Telegram bot for admin notifications:');
console.log('1️⃣ Open Telegram app on your phone or desktop');
console.log(`2️⃣ Search for your bot (@${botUsername}_bot or the name you gave it)`);
console.log('3️⃣ Start a conversation by sending the message: /start');
console.log('\n🔄 Now starting bot in listening mode for 60 seconds to collect chat IDs...');

// Start the bot with polling to listen for messages
const bot = new TelegramBot(botToken, { polling: true });

// Array to store found chat IDs
const foundChatIds = [];

// Listen for any messages
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const username = msg.chat.username || 'Unknown';
  const firstName = msg.chat.first_name || '';
  const lastName = msg.chat.last_name || '';
  
  console.log(`\n📥 Received message from: ${firstName} ${lastName} (@${username})`);
  console.log(`🆔 Chat ID: ${chatId}`);
  
  if (!foundChatIds.includes(chatId)) {
    foundChatIds.push(chatId);
  }
  
  // Reply to the user
  bot.sendMessage(chatId, 
    `✅ *Success!* I've received your message.\n\nYour Chat ID is: \`${chatId}\`\n\n` +
    `To receive admin notifications, add this Chat ID to your \`.env.local\` file:\n\n` +
    `TELEGRAM_CHAT_IDS=${chatId}\n\n` +
    `If you already have other chat IDs, use a comma to separate them:\n\n` +
    `TELEGRAM_CHAT_IDS=${chatId},other_id`,
    { parse_mode: 'Markdown' }
  );
});

// Stop after 60 seconds
setTimeout(() => {
  bot.stopPolling();
  
  console.log('\n=== RESULTS ===');
  if (foundChatIds.length === 0) {
    console.log('❌ No messages received. Please make sure you sent a message to your bot.');
    console.log('Try running this script again and following the steps above.');
  } else {
    console.log(`✅ Found ${foundChatIds.length} chat IDs:`);
    foundChatIds.forEach((id, index) => {
      console.log(`   ${index + 1}. ${id}`);
    });
    
    console.log('\nUpdate your .env.local file with:');
    console.log(`TELEGRAM_CHAT_IDS=${foundChatIds.join(',')}`);
  }
  
  console.log('\n👉 After updating your .env.local file, run test-telegram.js to verify everything works!');
  process.exit(0);
}, 60000);

console.log('Listening for messages for 60 seconds... Please send a message to your bot now.');
