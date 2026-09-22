const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds');
const economy = require('../../systems/economy/economyManager');
const { getLoanTerms, validateLoanAmount } = require('../../systems/economy/loanManager');

function buildLoanPreviewEmbed(user, amount) {
  const terms = getLoanTerms(amount);
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return new EmbedBuilder()
    .setColor('#5865f2')
    .setTitle('💰 Loan Preview')
    .setDescription('Review the terms below before accepting this loan.')
    .addFields(
      { name: '💰 Loan Amount', value: `🪙 ${amount.toLocaleString()}`, inline: true },
      { name: '📈 Interest', value: `🪙 ${terms.interestAmount.toLocaleString()}`, inline: true },
      { name: '💳 Total Repayment', value: `🪙 ${terms.repaymentAmount.toLocaleString()}`, inline: true },
      { name: '⚠️ Penalty if Overdue', value: `🪙 ${terms.penaltyAmount.toLocaleString()}`, inline: true },
      { name: '📅 Due Date', value: `<t:${Math.floor(dueDate.getTime() / 1000)}:f>`, inline: true },
      { name: '🛡️ Warning', value: 'Failure to repay will deduct the penalty from your bank balance, even if it becomes negative.', inline: false }
    )
    .setFooter({ text: 'By accepting this loan you agree to repay it within 7 days. Failure to repay will result in an automatic penalty.' })
    .setTimestamp();
}

function buildApprovedEmbed(user, amount, terms, dueDate) {
  return new EmbedBuilder()
    .setColor('#57f287')
    .setTitle('✅ Loan Approved')
    .setDescription('Your loan has been approved and sent to your wallet.')
    .addFields(
      { name: '💸 Borrowed', value: `🪙 ${amount.toLocaleString()}`, inline: true },
      { name: '📈 Repayment', value: `🪙 ${terms.repaymentAmount.toLocaleString()}`, inline: true },
      { name: '📅 Due Date', value: `<t:${Math.floor(dueDate.getTime() / 1000)}:f>`, inline: true }
    )
    .setTimestamp();
}

function buildLoanActionRow(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('loan_accept').setLabel('✅ Accept Loan').setStyle(ButtonStyle.Success).setDisabled(disabled),
    new ButtonBuilder().setCustomId('loan_cancel').setLabel('❌ Cancel').setStyle(ButtonStyle.Danger).setDisabled(disabled)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loan')
    .setDescription('Request a loan from the bank')
    .addIntegerOption((option) =>
      option.setName('amount').setDescription('Loan amount').setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    const amount = interaction.options.getInteger('amount');

    if (!validateLoanAmount(amount)) {
      return interaction.editReply({
        embeds: [errorEmbed('❌ Invalid Loan Amount', 'Loan amounts must be between 10,000 and 100,000 and must be multiples of 10,000.')]
      });
    }

    const user = await economy.getUser(interaction.user.id, interaction.guild.id);

    if (user.hasLoan) {
      return interaction.editReply({
        embeds: [errorEmbed('❌ Existing Loan', 'You already have an active loan. Repay it before requesting another one.')]
      });
    }

    const terms = getLoanTerms(amount);
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const previewEmbed = buildLoanPreviewEmbed(user, amount);

    const row = buildLoanActionRow();

    await interaction.editReply({ embeds: [previewEmbed], components: [row] });

    const filter = (buttonInteraction) => ['loan_accept', 'loan_cancel'].includes(buttonInteraction.customId) && buttonInteraction.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000, max: 1 });

    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.customId === 'loan_cancel') {
        const cancelledEmbed = new EmbedBuilder()
          .setColor('#ed4245')
          .setTitle('❌ Loan Request Cancelled')
          .setDescription('No money was given.')
          .setTimestamp();

        await buttonInteraction.update({ embeds: [cancelledEmbed], components: [buildLoanActionRow(true)] });
        return;
      }

      if (buttonInteraction.customId === 'loan_accept') {
        const currentUser = await economy.getUser(interaction.user.id, interaction.guild.id);

        if (currentUser.hasLoan) {
          await buttonInteraction.update({
            embeds: [errorEmbed('❌ Existing Loan', 'You already have an active loan. Repay it before requesting another one.')],
            components: [buildLoanActionRow(true)]
          });
          return;
        }

        currentUser.wallet += amount;
        currentUser.hasLoan = true;
        currentUser.loanAmount = amount;
        currentUser.interestAmount = terms.interestAmount;
        currentUser.repaymentAmount = terms.repaymentAmount;
        currentUser.penaltyAmount = terms.penaltyAmount;
        currentUser.loanTakenAt = new Date();
        currentUser.dueDate = dueDate;
        currentUser.loanPaid = false;
        await currentUser.save();

        const approvedEmbed = buildApprovedEmbed(currentUser, amount, terms, dueDate);
        await buttonInteraction.update({ embeds: [approvedEmbed], components: [buildLoanActionRow(true)] });
      }
    });

    collector.on('end', async (collected) => {
      if (collected.size === 0) {
        const expiredEmbed = new EmbedBuilder()
          .setColor('#fee75c')
          .setTitle('⏰ Loan Request Expired')
          .setDescription('No action was taken.')
          .setTimestamp();

        try {
          await interaction.editReply({ embeds: [expiredEmbed], components: [buildLoanActionRow(true)] });
        } catch (error) {
          console.error('[Loan] Failed to update expired loan request:', error);
        }
      }
    });
  }
};
