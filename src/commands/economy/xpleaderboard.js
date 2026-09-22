const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../database/schemas/User');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xpleaderboard')
    .setDescription('View the top users by level and XP'),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    const users = await User.find({ guildId: interaction.guild.id })
      .sort({ level: -1, xp: -1 })
      .limit(10);

    const description = users.map((u, index) =>
      `**#${index + 1}** <@${u.userId}> — Level **${u.level || 1}** | XP **${(u.xp || 0).toLocaleString()}**`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setColor('#ffd166')
      .setTitle('🏆 XP Leaderboard')
      .setDescription(description || 'No XP data yet.');

    await interaction.editReply({ embeds: [embed] });
  }
};