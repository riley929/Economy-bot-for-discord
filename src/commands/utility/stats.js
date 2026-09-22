const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../database/schemas/User');
const Guild = require('../../database/schemas/Guild');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View bot statistics'),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
  await interaction.deferReply();
}

    const totalUsers = await User.countDocuments();
    const totalGuilds = interaction.client.guilds.cache.size;

    const guildData = await Guild.findOne({ guildId: interaction.guild.id });

    const embed = new EmbedBuilder()
      .setColor('#5865f2')
      .setTitle('📊 Bot Stats')
      .setDescription(
        `Servers: **${totalGuilds}**\n` +
        `Users (DB): **${totalUsers}**\n\n` +
        `🎰 Bets: **${guildData?.totalGamblingBets || 0}**\n` +
        `✅ Wins: **${guildData?.totalGamblingWins || 0}**\n` +
        `❌ Losses: **${guildData?.totalGamblingLosses || 0}**\n` +
        `🔥 Burned: **${(guildData?.totalMoneyBurned || 0).toLocaleString()} coins**`
      );

    await interaction.editReply({ embeds: [embed] });
  }
};