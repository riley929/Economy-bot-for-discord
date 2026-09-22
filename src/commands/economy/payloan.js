const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../../systems/economy/economyManager');
const { clearLoanData } = require('../../systems/economy/loanManager');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('payloan')
    .setDescription('Repay your active loan from your bank balance'),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    const user = await economy.getUser(interaction.user.id, interaction.guild.id);

    if (!user.hasLoan || !user.repaymentAmount) {
      return interaction.editReply({
        embeds: [errorEmbed('❌ No Active Loan', 'You do not currently have an active loan.')]
      });
    }

    if (user.bank < user.repaymentAmount) {
      const needed = user.repaymentAmount - user.bank;
      return interaction.editReply({
        embeds: [errorEmbed('❌ Insufficient Bank Balance', `You need **${needed.toLocaleString()}** more coins in your bank to repay the loan.`)]
      });
    }

    const amountPaid = user.repaymentAmount;

    user.bank -= amountPaid;
    user.loanPaid = true;
    clearLoanData(user);
    await user.save();

    const embed = new EmbedBuilder()
      .setColor('#57f287')
      .setTitle('✅ Loan Paid')
      .setDescription('Your loan has been fully repaid.')
      .addFields(
        { name: '💰 Amount Paid', value: `🪙 ${amountPaid.toLocaleString()}`, inline: true },
        { name: '📌 Remaining Loan', value: 'None', inline: true }
      )
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};
