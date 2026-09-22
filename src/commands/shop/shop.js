const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const shopManager = require('../../systems/shop/shopManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('View the economy shop'),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

        const items = shopManager.getShopItems();
    const dailyDeal = shopManager.getDailyDeal(interaction.guild.id);
    const dailyDealPrice = dailyDeal ? shopManager.getDailyDealPrice(dailyDeal) : null;

    const description = items.map(item => {
      const stock = item.stock === -1 ? 'Unlimited' : item.stock;
      const priceLine = item.id === dailyDeal?.id
        ? `Price: ~~${item.price.toLocaleString()}~~ **${dailyDealPrice.toLocaleString()} coins** (Daily Deal)`
        : `Price: **${item.price.toLocaleString()} coins**`;

      return (
        `\`[${item.id}]\` **${item.name}**\n` +
        `Type: \`${item.type}\` • ${priceLine} • Stock: **${stock}**\n` +
        `${item.description}`
      );
    }).join('\n\n');

    const embed = new EmbedBuilder()
      .setColor('#f1c40f')
      .setTitle('🛒 Economy Shop')
      .setDescription(description || 'No shop items available.')
      .setFooter({ text: 'Use /buy item:<ID> to purchase.' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};