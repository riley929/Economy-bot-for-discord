const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const shopManager = require('../../systems/shop/shopManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dailydeals')
    .setDescription('View today’s discounted shop item'),

  async execute(interaction) {
    const items = shopManager.getShopItems().filter(i => i.type !== 'external');

    if (!items.length) {
      return interaction.reply('❌ No daily deals available.');
    }

    const daySeed = new Date().toISOString().slice(0, 10);
    const index = [...daySeed].reduce((sum, char) => sum + char.charCodeAt(0), 0) % items.length;
    const item = items[index];

    const discount = 0.25;
    const dealPrice = Math.floor(item.price * (1 - discount));

    const embed = new EmbedBuilder()
      .setColor('#ffd700')
      .setTitle('🔥 Daily Deal')
      .setDescription(
        `**${item.name}**\n` +
        `ID: \`${item.id}\`\n` +
        `Original: ~~${item.price.toLocaleString()}~~ coins\n` +
        `Deal Price: **${dealPrice.toLocaleString()} coins**\n\n` +
        `Use /buy normally for now. Deal pricing can be wired into buying later.`
      );

    await interaction.reply({ embeds: [embed] });
  }
};