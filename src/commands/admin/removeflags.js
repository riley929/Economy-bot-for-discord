const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../database/schemas/User');

const OWNER_ID = '1364717311386325043';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removeflags')
    .setDescription('Remove exploit flags from a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to remove flags from')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Amount of flags to remove')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({
        content: '❌ You cannot use this command.',
        ephemeral: true
      });
    }

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }

    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    const userData = await User.findOne({
      userId: target.id,
      guildId: interaction.guild.id
    });

    if (!userData) {
      return interaction.editReply({
        content: '❌ That user has no economy data.'
      });
    }

    const before = userData.flags || 0;

    userData.flags = Math.max(0, before - amount);

    // auto unblacklist if low enough
    if (userData.flags < 5) {
      userData.blacklisted = false;
      userData.blacklistExpiresAt = null;
      userData.blacklistReason = null;
    }

    await userData.save();

    const embed = new EmbedBuilder()
      .setColor('#57f287')
      .setTitle('🛡️ Flags Removed')
      .setDescription(
        `Removed **${amount}** flag(s) from ${target}.\n\n` +
        `Before: **${before}**\n` +
        `After: **${userData.flags}**`
      )
      .setFooter({
        text: `Action by ${interaction.user.tag}`
      })
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed]
    });
  }
};