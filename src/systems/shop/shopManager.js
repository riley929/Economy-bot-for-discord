const path = require('path');
const { EmbedBuilder } = require('discord.js');
const items = require(path.join(__dirname, '../../assets/items.json'));
const roles = require(path.join(__dirname, '../../assets/roles.json'));
const marketItems = require(path.join(__dirname, './marketItems'));
const economy = require('../economy/economyManager');
const { addItem } = require('./inventoryManager');
const { awardAchievement } = require('../economy/achievementManager');
const { ORDER_CHANNEL_ID } = require('../../config/config');
const User = require(path.join(__dirname, '../..', 'database', 'schemas', 'User'));

async function sendShopLog(guildId, payload) {
  const guild = global.client?.guilds.cache.get(guildId);
  if (!guild) return;

    const channel = guild.channels.cache.get(ORDER_CHANNEL_ID);
  if (!channel) return;

  await channel.send(payload).catch(() => {});
}

function getShopItems() {
  return [
    ...items,
    ...roles
  ];
}

function getItemById(itemId) {
  const found = [...items, ...roles].find(
  item => String(item.id).toLowerCase() === String(itemId).toLowerCase()
);

if (found) return found;

return marketItems.find(
  item => String(item.id).toLowerCase() === String(itemId).toLowerCase()
);
}

function getDailyDeal(guildId) {
  const items = getShopItems().filter(item => item.type !== 'external' && item.type !== 'role');

  if (!items.length) return null;

  const dateSeed = new Date().toISOString().slice(0, 10);
  const numericSeed = [...`${guildId}-${dateSeed}`].reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return items[numericSeed % items.length];
}

function getDailyDealPrice(item) {
  if (!item || typeof item.price !== 'number') return null;
  const discount = 0.25;
  return Math.floor(item.price * (1 - discount));
}

function getProgressivePrice(basePrice, currentOwned = 0, quantity = 1, discount = 0) {
  let total = 0;
  const multiplier = 1.15;
  const effectiveBase = Math.max(0, Math.floor(basePrice * (1 - discount)));

  for (let step = 0; step < quantity; step += 1) {
    const level = currentOwned + step;
    total += Math.round(effectiveBase * Math.pow(multiplier, level));
  }

  return total;
}

async function buyItem(userId, guildId, itemId, quantity = 1, options = {}) {
  const item = getItemById(itemId);
  const discount = options.discount || 0;
  const unlockedAchievements = [];

  if (!item) {
    return { success: false, reason: 'ITEM_NOT_FOUND' };
  }

  if (item.type === 'external') {
    return { success: false, reason: 'EXTERNAL_ITEM', item };
  }

  if (quantity < 1) {
    return { success: false, reason: 'INVALID_QUANTITY' };
  }

  const user = await economy.getUser(userId, guildId);
  // Special-case: extraLuck is limited to 1 per user and only buyable as quantity 1
  user.upgrades = user.upgrades || {};
  const currentOwned = item.type === 'upgrade'
    ? (user.upgrades && user.upgrades[item.id]) || 0
    : (user.items && user.items.get(item.id)) || 0;

  if (item.id === 'extraLuck') {
    if (quantity > 1) {
      return { success: false, reason: 'INVALID_QUANTITY', message: 'Extra Luck can only be purchased once.' };
    }
    // Attempt an atomic update: only set extraLuck and deduct wallet if not already owned and wallet sufficient
    const totalPrice = getProgressivePrice(item.price, currentOwned, quantity, discount);
    const atomic = await User.findOneAndUpdate(
      {
        userId,
        guildId,
        $or: [ { 'upgrades.extraLuck': { $exists: false } }, { 'upgrades.extraLuck': { $lt: 1 } } ],
        wallet: { $gte: totalPrice }
      },
      {
        $inc: { wallet: -totalPrice, lifetimeSpent: totalPrice, shopPurchases: 1 },
        $set: { 'upgrades.extraLuck': 1 }
      },
      { new: true }
    );

    if (!atomic) {
      // Not updated: determine reason
      const fresh = await economy.getUser(userId, guildId);
      if ((fresh.upgrades && fresh.upgrades.extraLuck >= 1)) {
        return { success: false, reason: 'ALREADY_OWN_EXTRA_LUCK', user: fresh, item };
      }
      if (fresh.wallet < totalPrice) {
        return { success: false, reason: 'NOT_ENOUGH_MONEY', user: fresh, item, totalPrice };
      }
      return { success: false, reason: 'PURCHASE_FAILED', user: fresh, item };
    }

    // successfully updated atomically
    const purchaseEmbed = new EmbedBuilder()
      .setColor('#f1c40f')
      .setTitle('🛒 Shop Purchase')
      .setDescription(`A user purchased an item from the shop.`)
      .addFields(
        {
          name: '👤 User',
          value: `<@${userId}>\n\`${userId}\``,
          inline: true
        },
        {
          name: '📦 Item',
          value: `**${quantity}x ${item.name}**\nID: \`${item.id}\``,
          inline: true
        },
        {
          name: '🏷️ Type',
          value: `\`${item.type || 'item'}\``,
          inline: true
        },
        {
          name: '💰 Cost',
          value: `**${totalPrice.toLocaleString()} coins**`,
          inline: true
        },
        {
          name: '💵 Wallet Before',
          value: `${(atomic.wallet + totalPrice).toLocaleString()} coins`,
          inline: true
        },
        {
          name: '💵 Wallet After',
          value: `${atomic.wallet.toLocaleString()} coins`,
          inline: true
        }
      )
      .setFooter({ text: 'Clover Economy • Shop Log' })
      .setTimestamp();

    await sendShopLog(guildId, { embeds: [purchaseEmbed] });

    if (atomic.shopPurchases >= 5) {
      if (awardAchievement(atomic, 'shrewd_shopper')) {
        unlockedAchievements.push('shrewd_shopper');
      }
    }

    if ((atomic.wallet + atomic.bank) >= 1_000_000) {
      if (awardAchievement(atomic, 'rich_million')) {
        unlockedAchievements.push('rich_million');
      }
    }

    if (unlockedAchievements.length > 0) {
      await atomic.save();
    }

    return { success: true, user: atomic, item, quantity, totalPrice, unlockedAchievements };
  }

  const totalPrice = getProgressivePrice(item.price, currentOwned, quantity, discount);
  if (user.wallet < totalPrice) {
    return {
      success: false,
      reason: 'NOT_ENOUGH_MONEY',
      user,
      item,
      totalPrice
    };
  }

  const walletBefore = user.wallet;
  user.wallet -= totalPrice;
  user.lifetimeSpent = (user.lifetimeSpent || 0) + totalPrice;
  user.shopPurchases = (user.shopPurchases || 0) + 1;

  if (item.id === 'extraLuck') {
    user.upgrades.extraLuck = 1;
  } else if (user.upgrades && user.upgrades[item.id] !== undefined) {
    user.upgrades[item.id] = (user.upgrades[item.id] || 0) + quantity;
  } else if (item.type === 'upgrade') {
    user.upgrades[item.id] = (user.upgrades[item.id] || 0) + quantity;
  } else if (item.type === 'role') {
  const guild = global.client.guilds.cache.get(guildId);

  if (!guild) {
    return {
      success: false,
      reason: 'GUILD_NOT_FOUND'
    };
  }

  const member = await guild.members.fetch(userId);

  await member.roles.add(item.roleId);

} else {
  addItem(user, item, quantity);
}

  await user.save();

  awardAchievement(user, 'shrewd_shopper');
  awardAchievement(user, 'rich_million');

  const purchaseEmbed = new EmbedBuilder()
    .setColor('#f1c40f')
    .setTitle('🛒 Shop Purchase')
    .setDescription(`A user purchased an item from the shop.`)
    .addFields(
      {
        name: '👤 User',
        value: `<@${userId}>\n\`${userId}\``,
        inline: true
      },
      {
        name: '📦 Item',
        value: `**${quantity}x ${item.name}**\nID: \`${item.id}\``,
        inline: true
      },
      {
        name: '🏷️ Type',
        value: `\`${item.type || 'item'}\``,
        inline: true
      },
      {
        name: '💰 Cost',
        value: `**${totalPrice.toLocaleString()} coins**`,
        inline: true
      },
      {
        name: '💵 Wallet Before',
        value: `${walletBefore.toLocaleString()} coins`,
        inline: true
      },
      {
        name: '💵 Wallet After',
        value: `${user.wallet.toLocaleString()} coins`,
        inline: true
      }
    )
    .setFooter({ text: 'Clover Economy • Shop Log' })
    .setTimestamp();

  await sendShopLog(guildId, { embeds: [purchaseEmbed] });

  return {
    success: true,
    user,
    item,
    quantity,
    totalPrice,
    unlockedAchievements
  };
}

module.exports = {
  getShopItems,
  getItemById,
  getDailyDeal,
  getDailyDealPrice,
  getProgressivePrice,
  buyItem
};