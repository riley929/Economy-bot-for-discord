const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const shopManager = require('../../systems/shop/shopManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('preview')
    .setDescription('Preview a shop item')
    .addStringOption(option =>
      option
        .setName('item')
        .setDescription('Item ID from /shop')
        .setRequired(true)
    ),

  async execute(interaction) {
    const itemId = interaction.options.getString('item');
    const item = shopManager.getItemById(itemId);

    if (!item) {
      return interaction.reply({ content: '❌ Item not found.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor('#f1c40f')
      .setTitle(`🔍 ${item.name}`)
      .setDescription(
        `ID: \`${item.id}\`\n` +
        `Type: \`${item.type}\`\n` +
        `Price: **${item.price.toLocaleString()} coins**\n` +
        `Stock: **${item.stock === -1 ? 'Unlimited' : item.stock}**\n\n` +
        `${item.description}`
      );

    await interaction.reply({ embeds: [embed] });
  }
};