const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const shopManager = require('../../systems/shop/shopManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roleshop')
    .setDescription('View buyable role items'),

  async execute(interaction) {
    const roles = shopManager.getShopItems().filter(item => item.type === 'role');

    if (!roles.length) {
      return interaction.reply('❌ No role items are available.');
    }

    const description = roles.map(role =>
      `**${role.name}**\n` +
      `ID: \`${role.id}\`\n` +
      `Price: **${role.price.toLocaleString()} coins**\n` +
      `${role.description}`
    ).join('\n\n');

    const embed = new EmbedBuilder()
      .setColor('#5865f2')
      .setTitle('🏷️ Role Shop')
      .setDescription(description)
      .setFooter({ text: 'Use /buy role:<ID> to purchase.' });

    await interaction.reply({ embeds: [embed] });
  }
};