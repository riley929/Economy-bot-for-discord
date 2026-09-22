const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const shopManager = require('../../systems/shop/shopManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buyrole')
    .setDescription('Buy a Discord role with coins')
    .addStringOption(option =>
      option
        .setName('role')
        .setDescription('Role item ID from /roleshop')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    const roleId = interaction.options.getString('role');
    const item = shopManager.getItemById(roleId);

    if (!item || item.type !== 'role') {
      return interaction.editReply('❌ That role item does not exist.');
    }

    const result = await shopManager.buyItem(
      interaction.user.id,
      interaction.guild.id,
      roleId,
      1
    );

    if (!result.success) {
      if (result.reason === 'NOT_ENOUGH_MONEY') {
        return interaction.editReply(
          `❌ You need **${result.totalPrice.toLocaleString()} coins**, but you only have **${result.user.wallet.toLocaleString()} coins**.`
        );
      }

      return interaction.editReply('❌ Could not buy that role.');
    }

    const embed = new EmbedBuilder()
      .setColor('#57f287')
      .setTitle('🏷️ Role Purchased')
      .setDescription(
  `You bought **${item.name}**.\n\n` +
  `Cost: **${result.totalPrice.toLocaleString()} coins**\n` +
  `Wallet: **${result.user.wallet.toLocaleString()} coins**\n\n` +
  `⚠️ This role is ** assigned automatically**.\n` 
);

    await interaction.editReply({ embeds: [embed] });
  }
};