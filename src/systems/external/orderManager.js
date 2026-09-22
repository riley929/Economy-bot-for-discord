const crypto = require('crypto');
const { EmbedBuilder } = require('discord.js');
const Order = require('../../database/schemas/Order');
const economy = require('../economy/economyManager');
const externalShop = require('../../config/externalShop');
const { ORDER_CHANNEL_ID } = require('../../config/config');

function createOrderId() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

async function sendOrderLog(guildId, payload) {
  const guild = global.client?.guilds.cache.get(guildId);
  if (!guild) return;

  const channel = guild.channels.cache.get(ORDER_CHANNEL_ID);
  if (!channel) return;

  await channel.send(payload).catch(() => {});
}

function getExternalItem(itemId) {
  return externalShop.find(item => item.id === itemId);
}

async function createOrder(userId, guildId, itemId, quantity = 1) {
  const item = getExternalItem(itemId);

  if (!item) {
    return { success: false, reason: 'ITEM_NOT_FOUND' };
  }

  const user = await economy.getUser(userId, guildId);
  const totalPrice = item.price * quantity;

  if (user.wallet < totalPrice) {
    return {
      success: false,
      reason: 'NOT_ENOUGH_MONEY',
      user,
      totalPrice
    };
  }

  const walletBefore = user.wallet;

  user.wallet -= totalPrice;
  await user.save();

  const order = await Order.create({
    orderId: createOrderId(),
    userId,
    guildId,
    itemId: item.id,
    itemName: item.name,
    quantity,
    totalPrice
  });

  const credits = (item.amount || 0) * quantity;

  const orderEmbed = new EmbedBuilder()
    .setColor('#f1c40f')
    .setTitle('📦 New Forza Order')
    .setDescription('A new external order has been created.')
    .addFields(
      {
        name: '👤 User',
        value: `<@${userId}>\n\`${userId}\``,
        inline: true
      },
      {
        name: '🆔 Order ID',
        value: `\`${order.orderId}\``,
        inline: true
      },
      {
        name: '📌 Status',
        value: '`Pending`',
        inline: true
      },
      {
        name: '📦 Item',
        value: `**${item.name}**\nID: \`${item.id}\``,
        inline: true
      },
      {
        name: '🔢 Quantity',
        value: `${quantity}`,
        inline: true
      },
      {
        name: '🏎️ Credits',
        value: `${credits.toLocaleString()}`,
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
    .setFooter({ text: 'Clover Economy • Order Log' })
    .setTimestamp();

  await sendOrderLog(guildId, { embeds: [orderEmbed] });

  return { success: true, order, user, item };
}

async function getUserOrders(userId, guildId) {
  return Order.find({ userId, guildId }).sort({ createdAt: -1 }).limit(10);
}

async function completeOrder(orderId, staffId, guildId) {
  const order = await Order.findOne({
    orderId: orderId.toUpperCase(),
    guildId
  });

  if (!order) {
    return { success: false, reason: 'ORDER_NOT_FOUND' };
  }

  if (order.status !== 'pending') {
    return { success: false, reason: 'NOT_PENDING', order };
  }

  order.status = 'completed';
  order.claimedBy = staffId;
  order.claimedAt = new Date();

  await order.save();
const buyer = await global.client.users.fetch(order.userId).catch(() => null);

if (buyer) {
  const dmEmbed = new EmbedBuilder()
    .setColor('#57f287')
    .setTitle('✅ Your Order Has Been Completed')
    .setDescription(
      `Your external order has been completed.\n\n` +
      `**Order ID:** \`${order.orderId}\`\n` +
      `**Item:** ${order.quantity}x ${order.itemName}\n\n` +
      `Thank you for using Clover.`
    )
    .setFooter({ text: 'Clover Economy • Order Completed' })
    .setTimestamp();

  await buyer.send({ embeds: [dmEmbed] }).catch(() => {});
}
  const completeEmbed = new EmbedBuilder()
    .setColor('#57f287')
    .setTitle('✅ Order Completed')
    .setDescription('An external order has been marked as completed.')
    .addFields(
      {
        name: '👤 User',
        value: `<@${order.userId}>\n\`${order.userId}\``,
        inline: true
      },
      {
        name: '🆔 Order ID',
        value: `\`${order.orderId}\``,
        inline: true
      },
      {
        name: '📌 Status',
        value: '`Completed`',
        inline: true
      },
      {
        name: '📦 Item',
        value: `**${order.quantity}x ${order.itemName}**`,
        inline: true
      },
      {
        name: '👮 Completed By',
        value: `<@${staffId}>\n\`${staffId}\``,
        inline: true
      },
      {
        name: '🕒 Completed',
        value: `<t:${Math.floor(order.claimedAt.getTime() / 1000)}:R>`,
        inline: true
      }
    )
    .setFooter({ text: 'Clover Economy • Order Log' })
    .setTimestamp();

  await sendOrderLog(guildId, { embeds: [completeEmbed] });

  return { success: true, order };
}

module.exports = {
  createOrder,
  getUserOrders,
  completeOrder
};