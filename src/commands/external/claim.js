const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const orderManager = require('../../systems/external/orderManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('claim')
    .setDescription('Mark an external order as completed')
    .addStringOption(option =>
      option
        .setName('orderid')
        .setDescription('Order ID to complete')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const orderId = interaction.options.getString('orderid');

    const result = await orderManager.completeOrder(
      orderId,
      interaction.user.id,
      interaction.guild.id
    );

    if (!result.success) {
      if (result.reason === 'ORDER_NOT_FOUND') {
        return interaction.editReply('❌ Order not found.');
      }

      if (result.reason === 'NOT_PENDING') {
        return interaction.editReply(`❌ That order is already **${result.order.status}**.`);
      }

      return interaction.editReply('❌ Could not claim order.');
    }

    const embed = new EmbedBuilder()
      .setColor('#57f287')
      .setTitle('✅ Order Completed')
      .setDescription(
        `Order ID: \`${result.order.orderId}\`\n` +
        `Item: **${result.order.quantity}x ${result.order.itemName}**\n` +
        `User: <@${result.order.userId}>\n` +
        `Completed by: <@${interaction.user.id}>`
      );

    await interaction.editReply({ embeds: [embed] });
  }
};