This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Database Management

This application includes several utilities to help manage the database:

### Database Management Scripts

The application includes platform-specific scripts to help manage your database:

#### Windows PowerShell (`db-manage.ps1`):

```powershell
./db-manage.ps1 <command> [options]
```

#### Unix/Linux/Mac (`db-manage.sh`):

```bash
./db-manage.sh <command> [options]
```

#### Node.js direct access (`db-manage.js`):

```bash
node db-manage.js <command> [options]
```

Available commands for all scripts:
- `check` - Check database tables existence
- `info` - Show database information (version, size, tables)
- `truncate [tables...]` - Truncate specific tables (removes all data)
- `drop [tables...]` - Drop specific tables (removes table structure)
- `clean` - Clean test data from the database
- `create [schema.sql]` - Create tables from schema file
- `backup [path]` - Backup the database (PowerShell/Bash scripts only)

Examples:
```bash
# Windows PowerShell
./db-manage.ps1 check
./db-manage.ps1 truncate orders order_entries

# Unix/Linux/Mac
./db-manage.sh info
./db-manage.sh clean

# Node.js direct access
node db-manage.js create ./migrations/schema.sql
node db-manage.js drop
```

### Clean Test Data (`clean-test-data.js`)

For quickly removing test data from the database:

```bash
node clean-test-data.js
```

This script identifies and removes data that matches test patterns, including:
- Orders with test names, emails, or IDs
- Test history entries
- Test phone entries
- Orphaned order entries

### Truncate Order Tables (`truncate-order-tables.js`)

For completely wiping the orders and order entries tables:

```bash
node truncate-order-tables.js
```

**Warning:** This is a destructive operation that will remove ALL data from the orders and order_entries tables.

## Flexible Pricing System

The application includes a flexible pricing system that supports both formula-based and tiered pricing models.
For detailed information, see [PRICING.md](./docs/PRICING.md).

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Telegram Notifications Setup

The application supports sending Telegram notifications to administrators when new orders are received. Follow these steps for a proper setup:

### 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send the message `/newbot` to BotFather
3. Follow the instructions to name your bot and choose a username
4. BotFather will give you a bot token that looks like `123456789:ABCdefGHIjklMNOpqrSTUvwxYZ`
5. Add this token to your `.env.local` file:
   ```
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   ```

### 2. Initialize Your Bot

For Telegram bots to send you messages, you must first start a conversation with them. Use our setup script:

```bash
node setup-telegram-bot.js
```

This will:
1. Wait for you to message your bot
2. Collect your chat ID automatically
3. Give you the exact settings to add to your `.env.local` file

Alternatively, you can:
- Message [@userinfobot](https://t.me/userinfobot) on Telegram to get your chat ID
- Send a message to your bot, then check `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`

### 3. Configure Your Environment

Make sure your `.env.local` file contains:

```
# Telegram Notifications
ENABLE_TELEGRAM_NOTIFICATIONS=true
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_IDS=123456789,987654321  # Your chat ID(s)
```

### 4. Test Your Setup

Test that everything is working:

```bash
node test-telegram.js
```

### Troubleshooting

If you get a "chat not found" error:
1. Make sure you've started a conversation with your bot (send it a message)
2. Verify your chat ID is correct using one of the methods above
3. Try running the setup script again to get your correct chat ID

Note: You can add multiple chat IDs separated by commas to send notifications to multiple admins. Each admin must first initiate a conversation with the bot before they can receive messages.
