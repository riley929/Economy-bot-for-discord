const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Order = require('../../database/schemas/Order');
const economy = require('../../systems/economy/economyManager');
const { isOwner } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cancelorder')
    .setDescription('Cancel a pending external order')
    .addStringOption(option =>
      option
        .setName('orderid')
        .setDescription('Order ID to cancel')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const orderId = interaction.options.getString('orderid').toUpperCase();

    const order = await Order.findOne({
      orderId,
      guildId: interaction.guild.id
    });

    if (!order) {
      return interaction.editReply('❌ Order not found.');
    }

    if (order.userId !== interaction.user.id && !isOwner(interaction.user.id)) {
      return interaction.editReply('❌ You can only cancel your own orders.');
    }

    if (order.status !== 'pending') {
      return interaction.editReply(`❌ This order is already **${order.status}**.`);
    }

    order.status = 'cancelled';
    await order.save();

    const user = await economy.getUser(order.userId, interaction.guild.id);
    user.wallet += order.totalPrice;
    await user.save();

    let dmStatus = '✅ DM sent to user.';

    const buyer = await interaction.client.users.fetch(order.userId).catch(() => null);

    if (buyer) {
      const dmEmbed = new EmbedBuilder()
        .setColor('#ed4245')
        .setTitle('❌ Your Order Was Cancelled')
        .setDescription(
          `Your external order has been cancelled.\n\n` +
          `**Order ID:** \`${order.orderId}\`\n` +
          `**Item:** ${order.quantity}x ${order.itemName}\n` +
          `**Refunded:** ${order.totalPrice.toLocaleString()} coins\n\n` +
          `The refunded coins have been added back to your wallet.`
        )
        .setFooter({ text: 'Clover Economy • Order Cancelled' })
        .setTimestamp();

      await buyer.send({ embeds: [dmEmbed] }).catch(() => {
        dmStatus = '⚠️ Could not DM user. They may have DMs closed.';
      });
    } else {
      dmStatus = '⚠️ Could not fetch user for DM.';
    }

    const embed = new EmbedBuilder()
      .setColor('#57f287')
      .setTitle('✅ Order Cancelled')
      .setDescription(
        `Order \`${order.orderId}\` has been cancelled.\n\n` +
        `Refunded: **${order.totalPrice.toLocaleString()} coins**\n` +
        `DM Status: ${dmStatus}`
      );

    return interaction.editReply({ embeds: [embed] });
  }
};