const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../database/schemas/User');

const OWNER_ID = '1364717311386325043';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('viewflags')
    .setDescription('Owner only: view flagged users'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (interaction.user.id !== OWNER_ID) {
      return interaction.editReply('❌ You are not allowed to use this.');
    }

    const users = await User.find({
      guildId: interaction.guild.id,
      flags: { $gt: 0 }
    }).sort({ flags: -1 }).limit(10);

    if (!users.length) {
      return interaction.editReply('✅ No flagged users.');
    }

    const desc = users.map(user =>
      `<@${user.userId}> — **${user.flags} flags** — Blacklisted: **${user.blacklisted ? 'Yes' : 'No'}**`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setColor('#ed4245')
      .setTitle('⚠️ Flagged Users')
      .setDescription(desc);

    await interaction.editReply({ embeds: [embed] });
  }
};