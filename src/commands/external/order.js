const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const orderManager = require('../../systems/external/orderManager');
const shop = require('../../config/externalShop');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('order')
    .setDescription('Order Forza 5 credits')
    .addStringOption(option =>
      option
        .setName('item')
        .setDescription('Select Forza credit package')
        .setRequired(true)
        .addChoices(
          { name: 'Forza Credits — 10M', value: 'fh5_10m' },
          { name: 'Forza Credits — 20M', value: 'fh5_20m' },
          { name: 'Forza Credits — 30M', value: 'fh5_30m' },
          { name: 'Forza Credits — 40M', value: 'fh5_40m' },
          { name: 'Forza Credits — 50M', value: 'fh5_50m' }
        )
    )
    .addIntegerOption(option =>
      option
        .setName('quantity')
        .setDescription('Amount to order')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(5)
    ),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    const itemId = interaction.options.getString('item');
    const quantity = interaction.options.getInteger('quantity') || 1;

    const item = shop.find(i => i.id === itemId);

    if (!item) {
      return interaction.editReply('❌ That Forza item does not exist.');
    }

    const result = await orderManager.createOrder(
      interaction.user.id,
      interaction.guild.id,
      itemId,
      quantity
    );

    if (!result.success) {
      if (result.reason === 'ITEM_NOT_FOUND') {
        return interaction.editReply('❌ That item does not exist.');
      }

      if (result.reason === 'NOT_EXTERNAL') {
        return interaction.editReply('❌ That item is not an external reward.');
      }

      if (result.reason === 'NOT_ENOUGH_MONEY') {
        const embed = new EmbedBuilder()
          .setColor('#ed4245')
          .setTitle('❌ Not Enough Money')
          .setDescription(
            `You need **${result.totalPrice.toLocaleString()} coins**, but you only have **${result.user.wallet.toLocaleString()} coins** in your wallet.\n\n` +
            `Use \`/withdraw amount:all\` if your money is in your bank.`
          );

        return interaction.editReply({ embeds: [embed] });
      }

      return interaction.editReply('❌ Could not create order.');
    }

    const embed = new EmbedBuilder()
      .setColor('#f1c40f')
      .setTitle('🎮 Forza Order Created')
      .addFields(
        { name: 'Order ID', value: `\`${result.order.orderId}\`` },
        { name: 'Item', value: `**${result.order.quantity}x ${result.order.itemName}**` },
        { name: 'Forza Credits', value: `**${(item.amount * quantity).toLocaleString()} credits**` },
        { name: 'Cost', value: `**${result.order.totalPrice.toLocaleString()} coins**`, inline: true },
        { name: 'Status', value: '**Pending**', inline: true }
      )
      .setDescription('A staff member will deliver this manually.')
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};