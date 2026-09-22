const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../../systems/economy/economyManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rich')
    .setDescription('Flex your wealth'),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
  await interaction.deferReply();
}

    const user = await economy.getUser(interaction.user.id, interaction.guild.id);
    const total = user.wallet + user.bank;

    const embed = new EmbedBuilder()
      .setColor('#ffd700')
      .setTitle('💎 Wealth Flex')
      .setDescription(
        `${interaction.user} is flexing hard.\n\n` +
        `💵 Wallet: **${user.wallet.toLocaleString()} coins**\n` +
        `🏦 Bank: **${user.bank.toLocaleString()} coins**\n` +
        `💰 Total Wealth: **${total.toLocaleString()} coins**\n\n` +
        `Absolute baller.`
      );

    await interaction.editReply({ embeds: [embed] });
  }
};