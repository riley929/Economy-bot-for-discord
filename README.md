# Eco-Bot

A comprehensive Discord economy bot with gambling, shop, roles, and admin systems built with Discord.js and MongoDB.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Configuration](#configuration)
- [Running the Bot](#running-the-bot)
- [Deploying Commands](#deploying-commands)
- [Features](#features)
- [Customization & Renaming](#customization--renaming)
- [File Structure](#file-structure)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have:

- **Node.js** (v18+)
- **npm** or **yarn**
- **MongoDB** (local or cloud instance like MongoDB Atlas)
- **Discord Server** (where you want to run the bot)
- **Discord Developer Account** and bot application created

### Steps to Create a Discord Bot:

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Go to "Bot" section and click "Add Bot"
4. Under TOKEN, click "Copy" to get your bot token (this is your `TOKEN`)
5. Go to OAuth2 → URL Generator
6. Select scopes: `bot`, `applications.commands`
7. Select permissions: `Administrator` (or specific permissions you need)
8. Copy the generated URL and invite the bot to your server
9. Note down your Server ID (Guild ID) and your Discord User ID

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd eco-bot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create a `.env` file in the root directory** (see [Environment Setup](#environment-setup))

## Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Discord Bot Token
TOKEN=your_discord_bot_token_here

# MongoDB Connection URI
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/eco-bot

# Discord Application ID
CLIENT_ID=your_discord_application_id

# Your Discord Server ID
GUILD_ID=your_server_id

# External API Key (if using external features)
API_KEY=your_api_key_here

# Dashboard Web Server Port
DASHBOARD_PORT=3000

# Dashboard URL (external access URL)
DASHBOARD_URL=http://localhost:3000

# Discord OAuth2 Client Secret (for dashboard authentication)
DISCORD_CLIENT_SECRET=your_discord_client_secret

# Session Secret (for session management)
SESSION_SECRET=your_random_secret_key_here

# Your Discord User ID (for owner-only commands)
OWNER_ID=your_discord_user_id
```

### How to Get Each Value:

| Variable | How to Get | Example |
|----------|-----------|---------|
| `TOKEN` | Discord Dev Portal → Your App → Bot → Copy Token | `MzI4MjUwNDcyNzI0Nzc...` |
| `CLIENT_ID` | Discord Dev Portal → Your App → General Information → Application ID | `1154063522188247121` |
| `GUILD_ID` | Right-click your server → Copy Server ID (enable Dev Mode first) | `1154063522188247121` |
| `OWNER_ID` | Right-click yourself in Discord → Copy User ID (enable Dev Mode) | `1364717311386325043` |
| `MONGO_URI` | MongoDB Atlas → Cluster → Connect → Copy Connection String | `mongodb+srv://user:pass@cluster.mongodb.net/eco-bot` |
| `DISCORD_CLIENT_SECRET` | Discord Dev Portal → OAuth2 → General → Client Secret | `kSCaM2_VBZ9X...` |
| `DASHBOARD_SECRET` | Generate a random string (use `openssl rand -hex 32`) | `a1b2c3d4e5f6...` |
| `API_KEY` | If using external APIs (Forza Horizon, etc.) | Your API key |
| `DASHBOARD_PORT` | Port for web dashboard | `3000` |
| `DASHBOARD_URL` | External URL to access dashboard | `http://localhost:3000` |

## Configuration

### 1. Owner ID Configuration

**File:** `src/config/permissions.js`

Update the `ownerId` with your Discord user ID:

```javascript
module.exports = {
  ownerId: '1364717311386325043', // Replace with your ID
  adminCommands: [
    'ownermoney',
    'blacklist',
    'unblacklist',
    'viewflags',
    'addMoney',
    'removeMoney',
    'setBalance',
    'resetUser'
  ]
};
```

### 2. Dashboard Owner IDs

**File:** `src/services/dashboard.js`

Update both owner IDs that have access to the dashboard:

```javascript
const OWNER_ID = '1364717311386325043';      // Replace with your ID
const OWNER_ID_2 = '1312903688209301565';    // Replace with secondary owner ID (or keep same)
```

### 3. Channel IDs for Logging

**File:** `src/config/config.js`

Set up logging channels:

```javascript
module.exports = {
  LOG_CHANNEL_ID: '1503785842425069659',      // Channel for general logs
  ORDER_CHANNEL_ID: '1503785880601497770'     // Channel for order notifications
};
```

To get channel IDs:
- Right-click the channel in Discord
- Click "Copy Channel ID" (Dev Mode must be enabled)

### 4. Role Configuration

**File:** `src/config/roles.js`

Update role IDs that players can purchase:

```javascript
module.exports = {
  roleItems: {
    vip_role: '1154063522188247121'  // Replace with your VIP role ID
  }
};
```

**File:** `src/assets/roles.json`

This file contains purchasable roles in the shop:

```json
[
  {
    "id": "573",
    "name": "VIP",
    "description": "VIP role giving you access to a special channel.",
    "type": "role",
    "price": 100000,
    "roleId": "1154063522188247121",  // Replace with actual role ID
    "stock": -1
  },
  {
    "id": "574",
    "name": "High Roller",
    "description": "Exclusive high roller role.",
    "type": "role",
    "price": 1000000,
    "roleId": "1524156758199632054",  // Replace with actual role ID
    "stock": -1
  },
  {
    "id": "575",
    "name": "Pimp",
    "description": "Exclusive premium role.",
    "type": "role",
    "price": 800000,
    "roleId": "1524157662852550777",  // Replace with actual role ID
    "stock": -1
  }
]
```

### 5. Shop Items

**File:** `src/assets/items.json`

Define purchasable items and their properties.

### 6. Economy Configuration

**File:** `src/config/economy.js`

Adjust economy balancing:

```javascript
module.exports = {
  WORK: {
    minPay: 200,          // Minimum work payout
    maxPay: 500,          // Maximum work payout
    cooldown: 60 * 60 * 1000  // 1 hour cooldown
  },
  DAILY: {
    baseReward: 1000,     // Base daily reward
    streakBonus: 100,     // Bonus per day streaked
    milestoneEvery: 7,    // Streak milestone every N days
    milestoneBonus: 2500, // Bonus at milestone
    cooldown: 24 * 60 * 60 * 1000,    // 24 hour cooldown
    resetAfter: 48 * 60 * 60 * 1000   // Reset streak after 48 hours
  },
  TRANSFER: {
    tax: 0.05,            // 5% tax on transfers
    maxTransfer: 250000   // Max transfer amount
  }
};
```

### 7. External Shop

**File:** `src/config/externalShop.js`

Configure external shop items (e.g., game currency):

```javascript
module.exports = [
  {
    id: '10M CREDITS',
    name: 'FORZA_HORIZON 6',
    price: 50000,
    amount: 10000000
  }
];
```

## Running the Bot

### 1. Deploy Slash Commands (First Time Only)

Run this script to register all slash commands with Discord:

```bash
node src/deploy-commands.js
```

You should see output like:
```
✅ Loaded deploy command: economy/balance
✅ Loaded deploy command: economy/work
...
🔄 Registering X slash command(s)...
✅ Slash commands registered.
```

### 2. Start the Bot

```bash
node src/index.js
```

Expected output:
```
✅ MongoDB connected
✅ Loaded command: economy/balance
✅ Loaded command: economy/work
...
✅ Loaded interaction event: interactionCreate
✅ Loaded client event: ready
✅ Logged in as EcoBot#1234
```

### 3. Access the Dashboard

Once the bot is running:
- Navigate to `http://localhost:3000` (or your DASHBOARD_URL)
- Click "Login with Discord"
- You'll have access to admin dashboard features

## Features

### Economy System
- `/work` - Earn money from work
- `/daily` - Get daily rewards
- `/balance` - Check your balance
- `/transfer` - Send money to others
- `/deposit` / `/withdraw` - Bank management
- `/loan` - Borrow money

### Gathering Activities
- `/hunt` - Hunt animals
- `/fish` - Fish for profit
- `/mine` - Mine resources
- `/scavenge` - Scavenge for items

### Gambling
- `/coinflip` - Flip a coin
- `/dice` - Roll dice
- `/slots` - Play slots
- `/blackjack` - Play blackjack
- `/roulette` - Play roulette
- `/crash` - Play crash game
- And more...

### Shop & Roles
- `/buy` - Purchase items
- `/shop` - View shop
- `/buyrole` - Purchase roles
- `/rolesshop` - View available roles

### Admin Commands
- `/addmoney` - Add money to user
- `/removemoney` - Remove money from user
- `/setbalance` - Set user balance
- `/blacklist` - Blacklist user
- `/unblacklist` - Remove from blacklist
- And more admin tools...

## File Structure

```
eco-bot/
├── src/
│   ├── commands/
│   │   ├── admin/          # Admin-only commands
│   │   ├── economy/        # Economy commands
│   │   ├── gambling/       # Gambling games
│   │   ├── roles/          # Role commands
│   │   ├── shop/           # Shop commands
│   │   ├── external/       # External shop commands
│   │   └── utility/        # Utility commands
│   ├── config/             # Configuration files
│   ├── database/           # MongoDB connection & schemas
│   ├── systems/            # Business logic systems
│   ├── services/           # External services (dashboard, webhooks)
│   ├── events/             # Discord event handlers
│   ├── jobs/               # Scheduled tasks
│   ├── assets/             # JSON data files
│   ├── utils/              # Helper utilities
│   ├── views/              # EJS templates for dashboard
│   ├── tests/              # Test files
│   ├── bot.js              # Main bot initialization
│   ├── index.js            # Entry point
│   └── deploy-commands.js  # Command deployment script
├── .env                    # Environment variables (create this)
├── package.json            # Dependencies
└── README.md              # This file
```

## Database Setup

The bot uses MongoDB for data storage. Two setup options:

### Option 1: MongoDB Atlas (Cloud - Recommended)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a cluster
4. Click "Connect" → "Drivers"
5. Copy the connection string
6. Replace `<username>`, `<password>`, and `<dbname>`
7. Add to `.env` as `MONGO_URI`

Example: `mongodb+srv://user:password@cluster0.mongodb.net/eco-bot`

### Option 2: MongoDB Local

1. Install MongoDB Community Edition
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/eco-bot`

## Customization & Renaming

### Rename Your Bot

If you want to change the bot name from "Eco-Bot" to something else (e.g., "CryptoBot", "EconomyBot"), follow these steps:

#### Step 1: Rename in Discord Developer Portal

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click on your bot application
3. Go to **"General Information"**
4. Change the **Application Name** to your new bot name
5. Click **"Save Changes"**

The bot will appear with the new name in Discord.

#### Step 2: Update Project Files

Update the bot name throughout your codebase:

**File: `package.json`**
```json
{
  "name": "your-new-bot-name",  // Change "eco-bot" to your new name
  "version": "1.0.0",
  "description": "A comprehensive Discord economy bot...",
  ...
}
```

**File: `README.md`**
- Change the first line heading from `# Eco-Bot` to `# YourNewBotName`
- Update any references to "Eco-Bot" in the description

### Rename Your Dashboard Website

If you want to change the website/dashboard name, update these files:

#### Step 1: Update Page Titles

**File: `src/views/dashboard.ejs`** (and other .ejs view files)

Look for `<title>` tags and update them:
```html
<title>Your New Bot Name - Dashboard</title>
```

#### Step 2: Update Dashboard Config

**File: `src/services/dashboard.js`**

Look for any hardcoded title or branding references and update:
```javascript
// Add or update the app title
const APP_TITLE = 'Your Bot Name Dashboard';
const APP_DESCRIPTION = 'Admin dashboard for Your Bot Name';
```

#### Step 3: Update Views

Search for "eco-bot" or "Eco-Bot" in all `.ejs` files in `src/views/`:
- `dashboard.ejs`
- `orders.ejs`
- `users.ejs`
- `servers.ejs`
- `bulktools.ejs`

Replace with your new bot/website name.

### Complete File Renaming Checklist

Here are ALL places where you might need to update the bot/website name:

| File | What to Change | Example |
|------|---------------|---------|
| `package.json` | `"name"` field | `"name": "my-economy-bot"` |
| `README.md` | Title and references | `# MyEconomyBot` |
| `src/views/dashboard.ejs` | Page title and headers | `<h1>MyBot Dashboard</h1>` |
| `src/views/orders.ejs` | Page title | `<title>MyBot - Orders</title>` |
| `src/views/users.ejs` | Page title | `<title>MyBot - Users</title>` |
| `src/views/servers.ejs` | Page title | `<title>MyBot - Servers</title>` |
| `src/views/bulktools.ejs` | Page title | `<title>MyBot - Bulk Tools</title>` |
| `src/utils/embeds.js` | Bot brand/footer text | `footer: { text: 'MyBot' }` |
| `src/services/dashboard.js` | App title variables | `const APP_TITLE = 'MyBot'` |

### Quick Find & Replace Guide

**Windows PowerShell - Find all mentions of "Eco-Bot":**
```powershell
Get-ChildItem -Recurse -Include "*.js", "*.ejs", "*.json" | Select-String -Pattern "Eco-Bot|eco-bot" -List | Select Path
```

**VS Code - Find & Replace:**
1. Press `Ctrl + H` to open Find and Replace
2. Find: `eco-bot` or `Eco-Bot`
3. Replace: `your-new-name` or `YourNewName`
4. Click "Replace All" (or review each replacement first)

### Example: Renaming from "Eco-Bot" to "CryptoBot"

1. **package.json:**
   ```json
   "name": "cryptobot",
   ```

2. **README.md:**
   ```markdown
   # CryptoBot
   ```

3. **dashboard.ejs:**
   ```html
   <title>CryptoBot - Admin Dashboard</title>
   <h1>CryptoBot Dashboard</h1>
   ```

4. **Discord Developer Portal:**
   - Application Name → "CryptoBot"

5. **Restart bot:**
   ```bash
   node src/index.js
   ```

**For detailed customization options and examples, see [CUSTOMIZATION_GUIDE.md](./CUSTOMIZATION_GUIDE.md)**

---

## Troubleshooting

### Bot Won't Start
- Check `.env` file exists and all variables are set
- Verify MongoDB connection string is correct
- Check Node.js version is v18+: `node --version`

### Commands Not Appearing
- Run `node src/deploy-commands.js` again
- Wait up to 1 hour for Discord to update
- Restart the bot
- Ensure `CLIENT_ID` and `GUILD_ID` are correct

### Database Connection Fails
- Verify `MONGO_URI` is correct
- If using Atlas, check IP whitelist (allow 0.0.0.0/0 for development)
- Test connection: `mongodb+srv://user:password@cluster.mongodb.net/test`

### Dashboard Won't Load
- Check if bot is running
- Verify `DASHBOARD_PORT` is not in use
- Try accessing `http://localhost:3000`
- Check browser console for errors

### Permission Errors
- Verify bot role is high enough in server role hierarchy
- Ensure bot has Administrator permission
- Check channel permissions allow bot to send messages

### Role IDs Not Working
- Confirm role IDs are correct (right-click role → Copy ID)
- Ensure bot role is above the target role in hierarchy
- Role must exist in the server

## Support & Contributions

For issues or feature requests, please create an issue in the repository.

---

**Created:** 2026
**License:** ISC
**Author:** Riley
