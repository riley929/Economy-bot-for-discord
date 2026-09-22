const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const externalShop = require('../../config/externalShop');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('externalshop')
    .setDescription('View Forza credits shop'),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    const items = externalShop.map(item => {
      return `🎮 **${item.name}**\n` +
             `💰 Price: **${item.price.toLocaleString()} coins**\n` +
             `📦 Credits: **${item.amount.toLocaleString()}**\n` +
             `🛒 Use: \`/order item:${item.id}\`\n`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor('#5865f2')
      .setTitle('🎮 Forza Credits Shop')
      .setDescription(items || 'No items available')
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};