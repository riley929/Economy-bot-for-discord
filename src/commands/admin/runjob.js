const { SlashCommandBuilder } = require('discord.js');
const { isOwner } = require('../../utils/permissions');
const { cleanupOldCancelledOrders } = require('../../jobs/cleanup');
const { applyBankInterest } = require('../../jobs/interestTick');
const { resetDailyStock } = require('../../jobs/stockReset');
const { runDailyReset } = require('../../jobs/dailyReset');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('runjob')
    .setDescription('Owner only: manually run maintenance jobs')
    .addStringOption(option =>
      option
        .setName('job')
        .setDescription('Job to run')
        .setRequired(true)
        .addChoices(
          { name: 'Cleanup Old Orders', value: 'cleanup' },
          { name: 'Apply Bank Interest', value: 'interest' },
          { name: 'Reset Stock', value: 'stock' },
          { name: 'Daily Reset', value: 'daily' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!isOwner(interaction.user.id)) {
      return interaction.editReply('❌ You are not allowed to use this.');
    }

    const job = interaction.options.getString('job');

    if (job === 'cleanup') {
      const count = await cleanupOldCancelledOrders();
      return interaction.editReply(`🧹 Cleanup complete. Removed **${count}** cancelled orders.`);
    }

    if (job === 'interest') {
      const count = await applyBankInterest(interaction.guild.id);
      return interaction.editReply(`🏦 Interest applied to **${count}** user(s).`);
    }

    if (job === 'stock') {
      resetDailyStock();
      return interaction.editReply('📦 Stock reset job ran.');
    }

    if (job === 'daily') {
      await runDailyReset();
      return interaction.editReply('🔁 Daily reset job ran.');
    }

    return interaction.editReply('❌ Unknown job.');
  }
};