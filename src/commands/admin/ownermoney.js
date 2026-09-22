const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../../systems/economy/economyManager');

const OWNER_ID = '1364717311386325043';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ownermoney')
    .setDescription('Owner only: give yourself money')
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Amount of coins to add')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (interaction.user.id !== OWNER_ID) {
      return interaction.editReply('❌ You are not allowed to use this.');
    }

    const amount = interaction.options.getInteger('amount');

    const user = await economy.addMoney(
      interaction.user.id,
      interaction.guild.id,
      amount
    );

    const embed = new EmbedBuilder()
      .setColor('#57f287')
      .setTitle('Owner Money Added')
      .setDescription(
        `Added **${amount.toLocaleString()} coins** to your wallet.\n\n` +
        `New wallet: **${user.wallet.toLocaleString()} coins**`
      );

    await interaction.editReply({ embeds: [embed] });
  }
};