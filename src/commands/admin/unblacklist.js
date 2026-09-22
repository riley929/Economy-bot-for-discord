const { SlashCommandBuilder } = require('discord.js');
const User = require('../../database/schemas/User');

const OWNER_ID = '1364717311386325043';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unblacklist')
    .setDescription('Owner only: unblacklist a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to unblacklist')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (interaction.user.id !== OWNER_ID) {
      return interaction.editReply('❌ You are not allowed to use this.');
    }

    const target = interaction.options.getUser('user');

    await User.findOneAndUpdate(
      {
        userId: target.id,
        guildId: interaction.guild.id
      },
      {
        blacklisted: false,
        flags: 0
      },
      {
        upsert: true,
        new: true
      }
    );

    await interaction.editReply(`✅ ${target.tag} has been unblacklisted and flags reset.`);
  }
};