const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const orderManager = require('../../systems/external/orderManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('orders')
    .setDescription('View your recent external orders'),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
  await interaction.deferReply();
}

    const orders = await orderManager.getUserOrders(
      interaction.user.id,
      interaction.guild.id
    );

    if (!orders.length) {
      return interaction.editReply('📦 You have no orders yet.');
    }

    const description = orders.map(order => {
      return (
        `**${order.quantity}x ${order.itemName}**\n` +
        `Order ID: \`${order.orderId}\`\n` +
        `Status: **${order.status}**\n` +
        `Cost: **${order.totalPrice.toLocaleString()} coins**`
      );
    }).join('\n\n');

    const embed = new EmbedBuilder()
      .setColor('#5865f2')
      .setTitle('📦 Your Orders')
      .setDescription(description);

    await interaction.editReply({ embeds: [embed] });
  }
};