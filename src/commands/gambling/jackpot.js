const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getGuildData } = require('../../systems/gambling/jackpotManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('jackpot')
    .setDescription('View the current casino jackpot'),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
  await interaction.deferReply();
}

    const guildData = await getGuildData(interaction.guild.id);

    const embed = new EmbedBuilder()
      .setColor('#ffd700')
      .setTitle('💎 Casino Jackpot')
      .setDescription(
        `Current Jackpot: **${guildData.jackpot.toLocaleString()} coins**\n\n` +
        `🎰 Total Bets: **${guildData.totalGamblingBets.toLocaleString()}**\n` +
        `✅ Wins: **${guildData.totalGamblingWins.toLocaleString()}**\n` +
        `❌ Losses: **${guildData.totalGamblingLosses.toLocaleString()}**\n` +
        `🔥 Money Burned: **${guildData.totalMoneyBurned.toLocaleString()} coins**\n\n` +
        `Jackpot Chance: **1 in 1,000,000**`
      );

    await interaction.editReply({ embeds: [embed] });
  }
};