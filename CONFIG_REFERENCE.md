# Eco-Bot Configuration Quick Reference

This file lists every configuration file and what needs to be customized.

## 🔧 Files That MUST Be Modified

### 1. `.env` (Root Directory) - CREATE THIS FILE
**Status:** ⚠️ CRITICAL - File doesn't exist yet

```env
TOKEN=                      # Discord bot token (copy from Dev Portal)
MONGO_URI=                  # MongoDB connection string
CLIENT_ID=                  # Discord app ID
GUILD_ID=                   # Your server ID
API_KEY=                    # External API key (or skip)
DASHBOARD_PORT=             # Usually 3000
DASHBOARD_URL=              # http://localhost:3000
DISCORD_CLIENT_SECRET=      # From Discord Dev Portal
SESSION_SECRET=             # Random 32-char string
OWNER_ID=                   # Your Discord user ID
```

**How to get each value:**
- `TOKEN` → Discord Dev Portal → Your Bot → Copy Token
- `MONGO_URI` → MongoDB Atlas → Connect → Copy Connection String
- `CLIENT_ID` → Discord Dev Portal → General Information
- `GUILD_ID` → Right-click server → Copy Server ID (need Dev Mode)
- `DISCORD_CLIENT_SECRET` → Discord Dev Portal → OAuth2
- `OWNER_ID` → Right-click yourself → Copy User ID (need Dev Mode)
- `SESSION_SECRET` → Generate: `openssl rand -hex 32`

**Location:** `d:\eco-bot\.env`

---

### 2. `src/config/permissions.js`
**Status:** ⚠️ NEEDS UPDATE

**Current:**
```javascript
module.exports = {
  ownerId: '1364717311386325043',  // ← CHANGE THIS
  adminCommands: [...]
};
```

**What to change:**
- Line 2: Replace `1364717311386325043` with your Discord User ID

**Location:** `d:\eco-bot\src\config\permissions.js`

---

### 3. `src/services/dashboard.js`
**Status:** ⚠️ NEEDS UPDATE

**Current (lines 12-13):**
```javascript
const OWNER_ID = '1364717311386325043';      // ← CHANGE THIS
const OWNER_ID_2 = '1312903688209301565';    // ← AND THIS
```

**What to change:**
- Line 12: Replace with your Discord User ID
- Line 13: Replace with secondary owner (or use same as line 12)

**Location:** `d:\eco-bot\src\services\dashboard.js`

---

### 4. `src/config/config.js`
**Status:** ⚠️ NEEDS UPDATE (OPTIONAL)

**Current:**
```javascript
module.exports = {
  LOG_CHANNEL_ID: '1503785842425069659',      // ← CHANGE THIS
  ORDER_CHANNEL_ID: '1503785880601497770'     // ← AND THIS
};
```

**What to change:**
- Line 2: Replace with your log channel ID
- Line 3: Replace with your order channel ID

**How to get channel IDs:**
- Right-click channel → Copy Channel ID (need Dev Mode)
- Or create new channels in server settings

**Location:** `d:\eco-bot\src\config\config.js`

---

### 5. `src/config/roles.js`
**Status:** ⚠️ NEEDS UPDATE

**Current:**
```javascript
module.exports = {
  roleItems: {
    vip_role: 'PUT_REAL_ROLE_ID_HERE'  // ← CHANGE THIS
  }
};
```

**What to change:**
- Replace `PUT_REAL_ROLE_ID_HERE` with actual VIP role ID

**How to get role ID:**
- Right-click role in Server Settings → Roles
- Copy the ID
- Or if role doesn't exist, create one first

**Location:** `d:\eco-bot\src\config\roles.js`

---

### 6. `src/assets/roles.json`
**Status:** ⚠️ NEEDS UPDATE

**Current:**
```json
[
  {
    "id": "573",
    "name": "VIP",
    "roleId": "1154063522188247121",  // ← CHANGE THIS
    ...
  },
  {
    "id": "574",
    "name": "High Roller",
    "roleId": "1524156758199632054",  // ← CHANGE THIS
    ...
  },
  {
    "id": "575",
    "name": "Pimp",
    "roleId": "1524157662852550777",  // ← CHANGE THIS
    ...
  }
]
```

**What to change:**
- All `roleId` values - replace with actual role IDs from your server
- You can also customize `name`, `description`, and `price` if desired

**How to get role IDs:**
- For existing roles: Right-click → Copy Role ID
- For new roles: Create in Server Settings → Roles first

**Location:** `d:\eco-bot\src\assets\roles.json`

---

## ✅ Files That Are OPTIONAL to Modify

### `src/config/economy.js`
**Status:** ℹ️ OPTIONAL - Already has good defaults

**Contains:**
- Work pay rates (200-500)
- Daily reward settings (1000 base)
- Transfer tax (5%)

**Edit if you want to:**
- Change how much money users earn
- Adjust cooldown times
- Tweak economic balance

---

### `src/assets/items.json`
**Status:** ℹ️ OPTIONAL - Define shop items

**Edit to:**
- Add/remove items from shop
- Change prices
- Set stock limits

---

### `src/config/gambling.js`
**Status:** ℹ️ OPTIONAL - Gambling odds

**Edit to:**
- Adjust winning odds
- Change payout multipliers
- Modify house edge

---

### `src/config/externalShop.js`
**Status:** ℹ️ OPTIONAL - External currency shop

**Edit to:**
- Add/remove Forza Horizon credit packs
- Change prices
- Add other external products

---

## 📋 Complete Setup Checklist

- [ ] Create `.env` file with all required variables
- [ ] Update `src/config/permissions.js` - Owner ID
- [ ] Update `src/services/dashboard.js` - Owner IDs
- [ ] Update `src/config/config.js` - Channel IDs (or leave blank for now)
- [ ] Update `src/config/roles.js` - VIP role ID
- [ ] Update `src/assets/roles.json` - All role IDs
- [ ] Run `npm install`
- [ ] Run `node src/deploy-commands.js`
- [ ] Run `node src/index.js` to start bot
- [ ] Test commands in Discord

---

## 🎨 Customization & Renaming Checklist

**See [CUSTOMIZATION_GUIDE.md](./CUSTOMIZATION_GUIDE.md) for detailed instructions**

### Want to rename the bot?

- [ ] Change bot name in Discord Developer Portal
- [ ] Update `package.json` - "name" field
- [ ] Update `README.md` - title
- [ ] Find & replace "Eco-Bot" → "YourBotName"
- [ ] Find & replace "eco-bot" → "yourbotname"
- [ ] Update all `.ejs` view files - page titles
- [ ] Update any hardcoded bot name in `.js` files
- [ ] Restart bot: `node src/index.js`

### Common Files to Update

| What to Change | Files to Update |
|---|---|
| **Bot Name** | `package.json`, `README.md`, all `.js` and `.ejs` files |
| **Dashboard Title** | `src/views/*.ejs` files (all .ejs files) |
| **Footer/Branding** | `src/utils/embeds.js`, `src/services/dashboard.js` |
| **Bot Avatar** | Discord Developer Portal → Bot section |
| **Bot Status** | `src/bot.js` - `client.user.setActivity()` |

### Quick Find & Replace

**VS Code (Ctrl + H):**
1. Find: `Eco-Bot` → Replace: `YourBotName`
2. Find: `eco-bot` → Replace: `yourbotname`
3. Review changes, then Replace All

---

## 🔑 Critical IDs Summary

Here's where to find each ID type:

### Discord IDs (You'll need 5 of these)

| ID Type | Where to Get | Example |
|---------|-------------|---------|
| **Bot Token** | Dev Portal → Bot → Copy Token | `MzI4MjUwNDcyNzI0Nzc...` |
| **Application ID (CLIENT_ID)** | Dev Portal → General Info → Application ID | `1154063522188247121` |
| **Server ID (GUILD_ID)** | Right-click server → Copy Server ID | `1154063522188247121` |
| **User ID (OWNER_ID)** | Right-click yourself → Copy User ID | `1364717311386325043` |
| **Client Secret** | Dev Portal → OAuth2 → Client Secret | `kSCaM2_VBZ9X...` |

**Enable Developer Mode First:**
- Discord Settings → Advanced → Developer Mode → ON

### Discord Resources You'll Create

| Resource | How to Create | Where to Get ID |
|----------|--------------|-----------------|
| **VIP Role** | Server Settings → Roles → Create Role | Right-click role → Copy Role ID |
| **High Roller Role** | Server Settings → Roles → Create Role | Right-click role → Copy Role ID |
| **Pimp Role** | Server Settings → Roles → Create Role | Right-click role → Copy Role ID |
| **Log Channel** | Right-click channels → Create Channel | Right-click channel → Copy Channel ID |
| **Order Channel** | Right-click channels → Create Channel | Right-click channel → Copy Channel ID |

---

## 🚨 Important Rules

1. **Never share your `.env` file** - It contains sensitive tokens
2. **Bot role must be above all roles it manages** - Otherwise it can't assign them
3. **All IDs are numbers** - Copy them exactly
4. **MongoDB must be accessible** - Whitelist your IP if using Atlas
5. **Session Secret should be random** - Use `openssl rand -hex 32` to generate

---

## Quick Start Commands

```bash
# 1. Install dependencies
npm install

# 2. Deploy slash commands
node src/deploy-commands.js

# 3. Start the bot
node src/index.js

# 4. Access dashboard
# Open: http://localhost:3000
```

---

## File Modification Examples

### Example 1: Setting up `.env`
```env
TOKEN=your_discord_bot_token_here
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/eco-bot
CLIENT_ID=1154063522188247121
GUILD_ID=1154063522188247121
API_KEY=your_api_key_here
DASHBOARD_PORT=3000
DASHBOARD_URL=http://localhost:3000
DISCORD_CLIENT_SECRET=your_discord_client_secret_here
SESSION_SECRET=your_random_session_secret_key_here
OWNER_ID=1364717311386325043
```

### Example 2: Setting up roles.json
```json
[
  {
    "id": "573",
    "name": "VIP",
    "description": "VIP role giving you access to a special channel.",
    "type": "role",
    "price": 100000,
    "roleId": "1154063522188247121",
    "stock": -1
  }
]
```

---

## Verification Checklist

After completing setup, verify:

- [ ] `.env` file exists in root directory
- [ ] `TOKEN` works (bot can login)
- [ ] `MONGO_URI` works (database connects)
- [ ] All owner IDs are correct (admin commands work)
- [ ] All role IDs are correct (roles can be assigned)
- [ ] Channel IDs are correct (logs appear)
- [ ] Bot role is high enough in role hierarchy
- [ ] All slash commands are registered

---

**Last Updated:** 2026-09-22
**Version:** 1.0
