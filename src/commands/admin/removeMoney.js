const { SlashCommandBuilder } = require('discord.js');
const economy = require('../../systems/economy/economyManager');
const { isOwner } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removemoney')
    .setDescription('Remove money from a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to remove money from')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Amount of coins to remove')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!isOwner(interaction.user.id)) {
      return interaction.editReply('❌ You are not allowed to use this.');
    }

    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    const user = await economy.getUser(target.id, interaction.guild.id);

    user.wallet = Math.max(0, user.wallet - amount);
    await user.save();

    return interaction.editReply(
      `💸 Removed **${amount.toLocaleString()} coins** from **${target.tag}**.\n` +
      `New wallet: **${user.wallet.toLocaleString()} coins**`
    );
  }
};