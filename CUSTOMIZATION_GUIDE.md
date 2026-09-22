# Eco-Bot Customization Guide

This guide covers all the ways you can customize and rename your bot and dashboard.

## 🎯 Quick Customization Goals

- [Rename the Bot](#rename-the-bot)
- [Customize the Dashboard](#customize-the-dashboard)
- [Change Dashboard Title](#change-dashboard-title)
- [Update Bot Description](#update-bot-description)
- [Add Custom Branding](#add-custom-branding)
- [Change Bot Avatar](#change-bot-avatar)

---

## Rename the Bot

### What Gets Renamed?

When you rename your bot, you need to update:
1. The Discord bot name (in Developer Portal)
2. The project name (in package.json)
3. References in code, documentation, and views

### Step 1: Discord Developer Portal

**Before:** Application name is "Clover"  
**After:** Application name is "CryptoBot" (or your chosen name)

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Click **"General Information"** in left sidebar
4. Under "Application Name", change the name
5. Click **"Save Changes"**
6. The bot will appear with the new name in Discord

### Step 2: Update package.json

**File:** `package.json` (root directory)

```json
{
  "name": "cryptobot",          // ← Change this (all lowercase, hyphens ok)
  "version": "1.0.0",
  "description": "A comprehensive Discord economy bot with gambling, shop, and economy systems.",
  ...
}
```

**Rule:** Use lowercase with hyphens (e.g., `my-economy-bot`, `crypto-bot`, `economy-bot`)

### Step 3: Update Documentation

**File:** `README.md`

Change the title:
```markdown
# Eco-Bot                      ← OLD
↓
# CryptoBot                    ← NEW
```

### Step 4: Search & Replace for All Mentions

Use VS Code's Find & Replace to update all remaining references:

1. Press `Ctrl + H` (or `Cmd + Shift + H` on Mac)
2. **Find:** `Clover` (the display name)
3. **Replace:** `CryptoBot` (your new name)
4. Click **"Replace All"**

Repeat for:
- Find: `clover` → Replace: `cryptobot` (lowercase version)

### Step 5: Update Command Logging

**File:** `src/utils/embeds.js` (if it exists)

Look for bot name in footer/branding:
```javascript
// OLD
footer: { text: 'clover' }

// NEW
footer: { text: 'CryptoBot' }
```

### Step 6: Restart Bot

```bash
node src/index.js
```

The bot will restart with the new name.

---

## Customize the Dashboard

The dashboard is the web interface accessed at `http://localhost:3000`.

### Change Dashboard Title

**File:** `src/services/dashboard.js`

Add or update title variables (around line 8):

```javascript
const APP_TITLE = 'CryptoBot Dashboard';
const APP_DESCRIPTION = 'Admin management dashboard for CryptoBot';
```

Then reference in your views.

### Update All View Files

Your dashboard HTML is in `src/views/` with `.ejs` extension. Update the `<title>` tags:

**File: `src/views/dashboard.ejs`**
```html
<!-- OLD -->
<title>clover - Dashboard</title>

<!-- NEW -->
<title>CryptoBot - Dashboard</title>
```

**File: `src/views/users.ejs`**
```html
<!-- OLD -->
<title>clover - Users</title>

<!-- NEW -->
<title>CryptoBot - Users</title>
```

**File: `src/views/orders.ejs`**
```html
<!-- OLD -->
<title>clover - Orders</title>

<!-- NEW -->
<title>CryptoBot - Orders</title>
```

**File: `src/views/servers.ejs`**
```html
<!-- OLD -->
<title>clover - Servers</title>

<!-- NEW -->
<title>CryptoBot - Servers</title>
```

**File: `src/views/bulktools.ejs`**
```html
<!-- OLD -->
<title>clover - Bulk Tools</title>

<!-- NEW -->
<title>CryptoBot - Bulk Tools</title>
```

### Update Navigation & Headers

In each `.ejs` file, look for `<h1>`, `<h2>`, and header tags:

```html
<!-- Before -->
<h1>clover Dashboard</h1>
<p>Welcome to clover</p>

<!-- After -->
<h1>CryptoBot Dashboard</h1>
<p>Welcome to CryptoBot</p>
```

---

## Change Bot Description

**File:** `package.json`

```json
{
  "name": "cryptobot",
  "description": "Your custom bot description here",  // ← Change this
  ...
}
```

**File:** `README.md` (top section)

```markdown
# CryptoBot

Your custom description about what the bot does.
```

---

## Add Custom Branding

### Bot Avatar/Icon

1. Go to Discord Developer Portal → Your App → Bot
2. Click on the bot avatar
3. Choose "Upload Image"
4. Select your custom bot icon (recommended: 512x512 PNG)
5. Click "Save Changes"

The bot will appear with your custom avatar in Discord.

### Bot Status/Activity

**File:** `src/bot.js` (around line 80, in the `ready` event)

```javascript
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  
  // Set bot status
  client.user.setActivity('/help', { type: 'LISTENING' });
  // or
  client.user.setActivity('the economy', { type: 'WATCHING' });
  // or
  client.user.setActivity('your commands', { type: 'PLAYING' });
  
  startDashboard(client);
  startLoanManager();
});
```

**Activity Types:**
- `PLAYING` - "Playing X"
- `STREAMING` - "Streaming X"
- `LISTENING` - "Listening to X"
- `WATCHING` - "Watching X"
- `COMPETING` - "Competing in X"

### Dashboard Styling

**File:** `src/services/dashboard.js` or view files

You can add custom CSS:

```html
<style>
  :root {
    --primary-color: #7289DA;    /* Discord blue */
    --secondary-color: #2C2F33;  /* Dark gray */
    --success-color: #43B581;    /* Green */
  }
</style>
```

---

## Update Logging

### Bot Log Channel

If you want logs to go to a specific channel with your bot's branding:

**File:** `src/config/config.js`

```javascript
module.exports = {
  LOG_CHANNEL_ID: '1503785842425069659',
  ORDER_CHANNEL_ID: '1503785880601497770',
  BOT_NAME: 'CryptoBot',  // ← Add this
  BOT_COLOR: 0x7289DA     // Discord blue hex
};
```

Then in your logging code:

```javascript
const { BOT_NAME, BOT_COLOR } = require('../config/config');

// Create embed
const embed = {
  color: BOT_COLOR,
  author: {
    name: BOT_NAME,
    icon_url: client.user.avatarURL()
  },
  title: 'Transaction Logged',
  timestamp: new Date()
};
```

---

## Search & Replace Strategies

### VS Code (Recommended)

**Keyboard Shortcut:**
- Windows/Linux: `Ctrl + H`
- Mac: `Cmd + Shift + H`

**Example 1: Rename "eco-bot" to "cryptobot"**
1. Find: `eco-bot`
2. Replace: `cryptobot`
3. Select files to replace (exclude node_modules)
4. Click "Replace All"

**Example 2: Rename "Eco-Bot" to "CryptoBot"**
1. Find: `Eco-Bot`
2. Replace: `CryptoBot`
3. Click "Replace All"

**Filtering Files:**
- Use `*.js` to replace only JavaScript files
- Use `*.ejs` to replace only template files
- Use `*.md` to replace only Markdown files

### PowerShell (Windows)

**Find all mentions:**
```powershell
Get-ChildItem -Recurse -Include "*.js","*.ejs","*.json","*.md" | Select-String "eco-bot|Eco-Bot" | Select Path, Line
```

**Replace in all files:**
```powershell
Get-ChildItem -Recurse -Include "*.js","*.ejs","*.json","*.md" | ForEach-Object {
  (Get-Content $_) -replace "Eco-Bot", "CryptoBot" | Set-Content $_
}
```

### Command Line (macOS/Linux)

**Find all mentions:**
```bash
grep -r "eco-bot\|Eco-Bot" src/ --include="*.js" --include="*.ejs"
```

**Replace in all files:**
```bash
find src -name "*.js" -o -name "*.ejs" | xargs sed -i 's/Eco-Bot/CryptoBot/g'
```

---

## Complete Customization Checklist

### Phase 1: Discord Settings
- [ ] Change bot name in Discord Developer Portal
- [ ] Upload custom bot avatar
- [ ] Set bot status/activity

### Phase 2: Code Updates
- [ ] Update `package.json` - name field
- [ ] Update `README.md` - title
- [ ] Find & replace all "Eco-Bot" references
- [ ] Find & replace all "eco-bot" references

### Phase 3: Views & Dashboard
- [ ] Update `src/views/dashboard.ejs` - title
- [ ] Update `src/views/users.ejs` - title
- [ ] Update `src/views/orders.ejs` - title
- [ ] Update `src/views/servers.ejs` - title
- [ ] Update `src/views/bulktools.ejs` - title
- [ ] Update any `<h1>` headers in views
- [ ] Update footer branding in embeds

### Phase 4: Testing
- [ ] Restart bot: `node src/index.js`
- [ ] Check bot appears with new name in Discord
- [ ] Check bot status/activity is set correctly
- [ ] Open dashboard: `http://localhost:3000`
- [ ] Verify page titles changed
- [ ] Check embeds show correct branding

### Phase 5: Documentation
- [ ] Update `README.md` with new bot name
- [ ] Update `SETUP_GUIDE.md` if needed
- [ ] Update any internal docs

---

## Customization Examples

### Example 1: Eco-Bot → CryptoBot

**Files to update:**

1. **package.json**
   ```json
   "name": "cryptobot"
   ```

2. **README.md**
   ```markdown
   # CryptoBot
   A comprehensive Discord cryptocurrency economy bot...
   ```

3. **src/views/dashboard.ejs**
   ```html
   <title>CryptoBot - Dashboard</title>
   <h1>CryptoBot Admin Panel</h1>
   ```

4. **src/utils/embeds.js**
   ```javascript
   footer: { text: 'CryptoBot Economy System' }
   ```

### Example 2: Eco-Bot → LootBot

Same process, just replace:
- `clover` → `lootbot`
- `clover` → `LootBot`

### Example 3: Eco-Bot → MyServerBot

Same process:
- `clover` → `myserverbot`
- `clover` → `MyServerBot`

---

## Troubleshooting Customization

### Bot Name Not Updating

**Issue:** You renamed the bot in Discord but it still shows the old name in embeds/logs

**Solution:**
1. Check all `.js` files for hardcoded bot name
2. Search for "Eco-Bot" in entire project: `Ctrl + Shift + F` in VS Code
3. Update all matches
4. Restart bot

### Dashboard Shows Old Name

**Issue:** Dashboard still shows "Eco-Bot" even after renaming

**Solution:**
1. Check all `.ejs` files in `src/views/`
2. Look for `<title>` tags
3. Update all to new name
4. Clear browser cache (Ctrl + Shift + Delete)
5. Reload dashboard

### Embeds Still Show Old Name

**Issue:** Chat embeds still mention old bot name

**Solution:**
1. Find file `src/utils/embeds.js` (or wherever embeds are created)
2. Search for "Eco-Bot"
3. Replace with new bot name
4. Restart bot

---

## Best Practices

1. **Use VS Code Find & Replace** - It's the safest way to rename things
2. **Review changes before committing** - Don't auto-replace everything blindly
3. **Update documentation** - Keep README and guides in sync with new name
4. **Test thoroughly** - Restart bot and check embeds/titles load correctly
5. **Backup first** - Consider using Git to save current state before major changes

---

## Related Documentation

- [README.md](./README.md) - Main project documentation
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Initial setup instructions
- [CONFIG_REFERENCE.md](./CONFIG_REFERENCE.md) - Configuration reference

---

**Last Updated:** 2026-09-22
**Version:** 1.0
