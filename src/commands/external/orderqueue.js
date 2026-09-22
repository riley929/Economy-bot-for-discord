const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getPendingOrders } = require('../../systems/external/deliveryQueue');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('orderqueue')
    .setDescription('View pending external orders')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const orders = await getPendingOrders(interaction.guild.id, 10);

    if (!orders.length) {
      return interaction.editReply('✅ No pending orders.');
    }

    const desc = orders.map((order, index) =>
      `**#${index + 1}** \`${order.orderId}\`\n` +
      `User: <@${order.userId}>\n` +
      `Item: **${order.quantity}x ${order.itemName}**\n` +
      `Cost: **${order.totalPrice.toLocaleString()} coins**`
    ).join('\n\n');

    const embed = new EmbedBuilder()
      .setColor('#f1c40f')
      .setTitle('📦 Pending Order Queue')
      .setDescription(desc);

    await interaction.editReply({ embeds: [embed] });
  }
};