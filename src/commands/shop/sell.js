const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../../systems/economy/economyManager');
const shopManager = require('../../systems/shop/shopManager');

function errorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor('#ed4245')
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sell')
    .setDescription('Sell an inventory item for 50% of shop price')
    .addStringOption(option =>
      option
        .setName('item')
        .setDescription('Item ID to sell')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('quantity')
        .setDescription('Quantity to sell')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)
    ),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    const itemId = interaction.options.getString('item');
    const quantity = interaction.options.getInteger('quantity') || 1;

    const user = await economy.getUser(
      interaction.user.id,
      interaction.guild.id
    );

    const invItem = user.inventory.find(i => i.itemId === itemId);

    if (!invItem || invItem.quantity < quantity) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Not Enough Items',
            'You do not own enough of that item to sell.'
          )
        ]
      });
    }

    if (invItem.type === 'role' || invItem.type === 'external') {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Item Cannot Be Sold',
            'Role and external items cannot be sold.'
          )
        ]
      });
    }

    const shopItem = shopManager.getItemById(itemId);
    const sellPrice = Math.floor(
      ((shopItem?.price || 100) * 0.5) * quantity
    );

    invItem.quantity -= quantity;

    if (invItem.quantity <= 0) {
      user.inventory = user.inventory.filter(
        i => i.itemId !== itemId
      );
    }

    user.wallet += sellPrice;
    await user.save();

    const itemName = invItem.name || shopItem?.name || itemId;

    const embed = new EmbedBuilder()
      .setColor('#57f287')
      .setTitle('💸 Sale Complete')
      .setDescription(
        `Successfully sold **${quantity}x ${itemName}**`
      )
      .addFields(
        {
          name: '📦 Item',
          value: `**${itemName}**`,
          inline: true
        },
        {
          name: '🔢 Quantity',
          value: `**${quantity}**`,
          inline: true
        },
        {
          name: '💰 Earned',
          value: `**${sellPrice.toLocaleString()}** coins`,
          inline: true
        },
        {
          name: '👛 Wallet',
          value: `**${user.wallet.toLocaleString()}** coins`,
          inline: true
        }
      )
      .setThumbnail(
        interaction.user.displayAvatarURL({ dynamic: true })
      )
      .setFooter({
        text: `${interaction.user.username} • Economy Shop`
      })
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed]
    });
  }
};