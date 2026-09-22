const { SlashCommandBuilder } = require('discord.js');
const economy = require('../../systems/economy/economyManager');
const { isOwner } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setbalance')
    .setDescription('Set a user wallet balance')
    .addUserOption(opt =>
      opt
        .setName('user')
        .setDescription('User to edit')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt
        .setName('amount')
        .setDescription('New wallet balance')
        .setRequired(true)
        .setMinValue(0)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!isOwner(interaction.user.id)) {
      return interaction.editReply('❌ No.');
    }

    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    const user = await economy.getUser(target.id, interaction.guild.id);
    user.wallet = amount;
    await user.save();

    await interaction.editReply(`⚖️ Set ${target.tag}'s wallet to ${amount.toLocaleString()} coins`);
  }
};