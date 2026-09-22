const { SlashCommandBuilder } = require('discord.js');
const User = require('../../database/schemas/User');
const { isOwner } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetuser')
    .setDescription('Reset a user economy profile')
    .addUserOption(opt =>
      opt
        .setName('user')
        .setDescription('User to reset')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!isOwner(interaction.user.id)) {
      return interaction.editReply('❌ No.');
    }

    const target = interaction.options.getUser('user');

    await User.deleteOne({
      userId: target.id,
      guildId: interaction.guild.id
    });

    await interaction.editReply(`🧹 Reset ${target.tag}`);
  }
};