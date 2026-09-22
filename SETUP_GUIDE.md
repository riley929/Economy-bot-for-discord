# Eco-Bot Setup Guide - Detailed Configuration

This guide walks through all the customization steps needed to get Eco-Bot running on your server.

## 📌 Quick Setup Checklist

- [ ] Create Discord bot and get TOKEN
- [ ] Create `.env` file with all required variables
- [ ] Set up MongoDB and get MONGO_URI
- [ ] Update owner IDs in configuration files
- [ ] Configure Discord channel IDs for logging
- [ ] Create and add role IDs to roles.json
- [ ] Install dependencies (`npm install`)
- [ ] Deploy slash commands (`node src/deploy-commands.js`)
- [ ] Start the bot (`node src/index.js`)

---

## Step 1: Create Discord Bot

### 1.1 Create Application
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"** (top right)
3. Enter name: `Eco-Bot`
4. Accept terms and click **"Create"**

### 1.2 Create Bot User
1. Click **"Bot"** in left sidebar
2. Click **"Add Bot"** button
3. Under "TOKEN" section, click **"Copy"**
4. Save this as your `TOKEN` in `.env` - this is sensitive!

### 1.3 Ensure Privileged Gateway Intents
1. Under "Bot" section, find "PRIVILEGED GATEWAY INTENTS"
2. Enable: **"Server Members Intent"** (if you need member data)
3. Enable: **"Message Content Intent"** (if using message commands)
   - For slash commands only, these can be disabled

### 1.4 Get Application ID
1. Click **"General Information"** in left sidebar
2. Copy "Application ID"
3. Save as `CLIENT_ID` in `.env`

### 1.5 Get Client Secret
1. Click **"OAuth2"** in left sidebar
2. Click **"General"**
3. Under "CLIENT INFORMATION", click **"Copy"** next to "Client Secret"
4. Save as `DISCORD_CLIENT_SECRET` in `.env`

### 1.6 Set OAuth2 Redirect URIs (for Dashboard)
1. Still in **OAuth2 → General**
2. Scroll down to "REDIRECT URLS"
3. Click **"Add Redirect"**
4. Enter: `http://localhost:3000/auth/discord/callback`
5. For production, also add: `https://yourdomain.com/auth/discord/callback`
6. Click **"Save"**

---

## Step 2: Set Up Your Discord Server

### 2.1 Enable Developer Mode
1. Open Discord settings
2. Go to **"Advanced"** (under App Settings)
3. Toggle **"Developer Mode"** ON

Now you can right-click to copy IDs!

### 2.2 Get Your Server ID
1. Right-click your server name (top left)
2. Click **"Copy Server ID"**
3. Save as `GUILD_ID` in `.env`

### 2.3 Get Your User ID
1. Right-click your username anywhere in Discord
2. Click **"Copy User ID"**
3. Save as `OWNER_ID` in `.env`

### 2.4 Invite Bot to Server
1. In Discord Developer Portal → Your App → OAuth2 → URL Generator
2. Select Scopes: `bot`, `applications.commands`
3. Select Permissions: 
   - `Administrator` (easiest for testing)
   - Or specific permissions: `Send Messages`, `Embed Links`, `Manage Roles`, `View Channels`, etc.
4. Copy the generated URL
5. Open in browser and select your server
6. Authorize the bot

### 2.5 Create Channels for Logging (Optional)
1. Right-click in channel list → **"Create Channel"**
2. Name it: `#bot-logs`
3. Right-click the channel → **"Copy Channel ID"**
4. Add to `src/config/config.js` as `LOG_CHANNEL_ID`

Repeat for order logs channel.

---

## Step 3: Create Roles for Economy

### 3.1 Create VIP Role
1. Server Settings → **"Roles"**
2. Click **"Create Role"**
3. Name: `VIP`
4. Choose color
5. Click **"Save"**
6. Right-click the role in list
7. Click **"Copy Role ID"**
8. Save this ID - you'll need it!

### 3.2 Create High Roller Role
Repeat the above with name: `High Roller`

### 3.3 Create Pimp Role
Repeat the above with name: `Pimp`

### 3.4 Ensure Bot Role is Above Custom Roles
1. Go to Server Settings → **"Roles"**
2. Find your bot's role (e.g., `Eco-Bot`)
3. Drag it above the roles you created (VIP, High Roller, Pimp)
4. This is required for the bot to assign roles!

**Example role hierarchy (top to bottom):**
```
@everyone
├── Eco-Bot (bot role) ← Must be high up
├── High Roller
├── Pimp
├── VIP
└── Other roles
```

---

## Step 4: Set Up MongoDB

### Option A: MongoDB Atlas (Cloud) - Recommended

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for free account
3. Click **"Build a Cluster"**
4. Select free tier (`M0 - Shared Sandbox`)
5. Choose your region
6. Click **"Create Cluster"** (takes 1-2 minutes)
7. Once created, click **"Connect"**
8. Choose **"Drivers"**
9. Select **"Node.js"** and version **4.x or higher**
10. Copy the connection string
11. Replace `<username>`, `<password>`, `<dbname>` with your credentials
    - Example: `mongodb+srv://admin:mypassword@cluster0.abc123.mongodb.net/eco-bot`
12. Save as `MONGO_URI` in `.env`

### Option B: MongoDB Local

1. Install [MongoDB Community Edition](https://docs.mongodb.com/manual/installation/)
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/eco-bot`
4. Save as `MONGO_URI` in `.env`

---

## Step 5: Update Configuration Files

### 5.1 Create `.env` File

Create file: `d:\eco-bot\.env`

```env
TOKEN=your_token_from_developer_portal
MONGO_URI=your_mongodb_connection_string
CLIENT_ID=your_application_id
GUILD_ID=your_server_id
API_KEY=skip_this_for_now
DASHBOARD_PORT=3000
DASHBOARD_URL=http://localhost:3000
DISCORD_CLIENT_SECRET=your_client_secret
SESSION_SECRET=generate_random_string_openssl_rand_hex_32
OWNER_ID=your_discord_user_id
```

Generate SESSION_SECRET:
```bash
# Windows PowerShell
[System.BitConverter]::ToString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)) -replace "-"

# Or use online: https://www.uuidgenerator.net/
```

### 5.2 Update `src/config/permissions.js`

```javascript
module.exports = {
  ownerId: '1364717311386325043',  // ← Replace with YOUR OWNER_ID
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

### 5.3 Update `src/services/dashboard.js`

Find and update (around line 12-13):

```javascript
const OWNER_ID = '1364717311386325043';      // ← Replace with YOUR OWNER_ID
const OWNER_ID_2 = '1312903688209301565';    // ← Replace with secondary owner or same as above
```

### 5.4 Update `src/config/config.js`

```javascript
module.exports = {
  LOG_CHANNEL_ID: '1503785842425069659',      // ← Replace with your log channel ID
  ORDER_CHANNEL_ID: '1503785880601497770'     // ← Replace with your order channel ID
};
```

To get channel IDs:
- Right-click channel → "Copy Channel ID" (Developer Mode must be ON)

### 5.5 Update `src/config/roles.js`

```javascript
module.exports = {
  roleItems: {
    vip_role: '1154063522188247121'  // ← Replace with your VIP role ID
  }
};
```

### 5.6 Update `src/assets/roles.json`

This file defines roles players can purchase. Replace all `roleId` values:

```json
[
  {
    "id": "573",
    "name": "VIP",
    "description": "VIP role giving you access to a special channel.",
    "type": "role",
    "price": 100000,
    "roleId": "1154063522188247121",  // ← Your VIP role ID
    "stock": -1
  },
  {
    "id": "574",
    "name": "High Roller",
    "description": "Exclusive high roller role.",
    "type": "role",
    "price": 1000000,
    "roleId": "1524156758199632054",  // ← Your High Roller role ID
    "stock": -1
  },
  {
    "id": "575",
    "name": "Pimp",
    "description": "Exclusive premium role.",
    "type": "role",
    "price": 800000,
    "roleId": "1524157662852550777",  // ← Your Pimp role ID
    "stock": -1
  }
]
```

How to find existing role IDs:
1. Right-click role in server settings → "Copy Role ID"
2. Or ask bot: Right-click role → Copy ID (if dev mode on)

---

## Step 6: Install & Run Bot

### 6.1 Install Dependencies

```bash
cd d:\eco-bot
npm install
```

Wait for all packages to install (~2-3 minutes).

### 6.2 Deploy Slash Commands

```bash
node src/deploy-commands.js
```

Expected output:
```
✅ Loaded deploy command: economy/balance
✅ Loaded deploy command: economy/work
...
🔄 Registering 50+ slash command(s)...
✅ Slash commands registered.
```

If you see errors, check:
- `.env` file exists with correct values
- `TOKEN`, `CLIENT_ID`, `GUILD_ID` are correct
- MongoDB connection is working

### 6.3 Start the Bot

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
✅ Logged in as EcoBot#1234
```

### 6.4 Test the Bot

In your Discord server:
1. Type `/balance`
2. Bot should respond with your balance
3. Try `/work` to earn money
4. Try `/shop` to see items

---

## Step 7: Access Dashboard (Optional)

Once bot is running:

1. Open browser: `http://localhost:3000`
2. Click "Login with Discord"
3. Authorize the app
4. You should see admin dashboard

If dashboard won't load:
- Check bot is running
- Check port 3000 isn't in use: `netstat -ano | findstr :3000`
- Check `DISCORD_CLIENT_SECRET` is correct
- Check OAuth2 redirect URI is set in Discord Dev Portal

---

## Common Issues & Solutions

### Bot won't start
```
ERROR: Cannot find module 'dotenv'
```
**Solution:** Run `npm install`

### Commands don't appear
```
TOKEN, CLIENT_ID, or GUILD_ID is missing/wrong
```
**Solution:** 
1. Check `.env` file exists
2. Run `node src/deploy-commands.js` again
3. Wait up to 1 hour for Discord to sync
4. Restart the bot

### MongoDB connection fails
```
MongoNetworkError: connect ECONNREFUSED
```
**Solution:**
- Check MONGO_URI is correct
- If using Atlas, whitelist your IP (0.0.0.0/0 for development)
- Test connection in MongoDB Atlas

### Bot can't assign roles
```
DiscordAPIError: Missing Permissions
```
**Solution:**
1. Go to Server Settings → Roles
2. Drag bot role ABOVE the target roles
3. Ensure bot has "Manage Roles" permission
4. Ensure role is not managed by integration

### Dashboard login fails
```
Invalid Client Secret
```
**Solution:**
1. Copy fresh Client Secret from Discord Dev Portal
2. Update `DISCORD_CLIENT_SECRET` in `.env`
3. Restart bot

---

## Configuration Summary

Here's what should be set by now:

| File | What to Change | Where |
|------|--------------|-------|
| `.env` | TOKEN, MONGO_URI, CLIENT_ID, GUILD_ID, OWNER_ID, etc. | Root directory |
| `src/config/permissions.js` | ownerId | Line 2 |
| `src/services/dashboard.js` | OWNER_ID, OWNER_ID_2 | Lines 12-13 |
| `src/config/config.js` | LOG_CHANNEL_ID, ORDER_CHANNEL_ID | Lines 2-3 |
| `src/config/roles.js` | vip_role ID | Line 3 |
| `src/assets/roles.json` | All roleId values | Throughout |

---

## Next Steps

Once bot is running:

1. **Customize economy values:** `src/config/economy.js`
2. **Add shop items:** `src/assets/items.json`
3. **Set up webhooks:** `src/services/webhook.js`
4. **Configure gambling odds:** `src/config/gambling.js`
5. **Add custom commands:** Create new file in `src/commands/`

---

## Need Help?

1. Check bot logs in console
2. Enable Debug Mode in Dashboard (if available)
3. Check Discord server for error messages
4. Verify all Role IDs are correct and bot role is high in hierarchy
5. Test commands manually in server

---

**Last Updated:** 2026-09-22
