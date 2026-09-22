const { EmbedBuilder } = require('discord.js');
const User = require('../../database/schemas/User');

const LOAN_TIERS = Object.freeze({
  10000: { repaymentAmount: 20000, penaltyAmount: 30000 },
  20000: { repaymentAmount: 35000, penaltyAmount: 50000 },
  30000: { repaymentAmount: 50000, penaltyAmount: 70000 },
  40000: { repaymentAmount: 60000, penaltyAmount: 85000 },
  50000: { repaymentAmount: 70000, penaltyAmount: 100000 },
  60000: { repaymentAmount: 85000, penaltyAmount: 120000 },
  70000: { repaymentAmount: 100000, penaltyAmount: 140000 },
  80000: { repaymentAmount: 115000, penaltyAmount: 160000 },
  90000: { repaymentAmount: 130000, penaltyAmount: 180000 },
  100000: { repaymentAmount: 150000, penaltyAmount: 200000 }
});

function getLoanTerms(amount) {
  const tier = LOAN_TIERS[amount];

  if (!tier) {
    return null;
  }

  return {
    loanAmount: amount,
    interestAmount: tier.repaymentAmount - amount,
    repaymentAmount: tier.repaymentAmount,
    penaltyAmount: tier.penaltyAmount
  };
}

function validateLoanAmount(amount) {
  return Number.isInteger(amount) && amount >= 10000 && amount <= 100000 && amount % 10000 === 0;
}

function clearLoanData(user) {
  user.hasLoan = false;
  user.loanAmount = 0;
  user.interestAmount = 0;
  user.repaymentAmount = 0;
  user.penaltyAmount = 0;
  user.loanTakenAt = null;
  user.dueDate = null;
  user.loanPaid = false;
}

async function processOverdueLoans() {
  const now = new Date();
  const overdueLoans = await User.find({
    hasLoan: true,
    loanPaid: false,
    dueDate: { $lte: now }
  });

  for (const user of overdueLoans) {
    const penaltyAmount = Number(user.penaltyAmount || 0);
    const originalLoan = Number(user.loanAmount || 0);

    user.bank -= penaltyAmount;
    clearLoanData(user);
    await user.save();

    try {
      const client = global.client;
      if (client?.users?.fetch) {
        const member = await client.users.fetch(user.userId);
        const overdueEmbed = new EmbedBuilder()
          .setColor('#ed4245')
          .setTitle('⚠️ Loan Overdue')
          .setDescription('Your loan is overdue and the penalty has been applied to your bank balance.')
          .addFields(
            { name: '💰 Original Loan', value: `🪙 ${originalLoan.toLocaleString()}`, inline: true },
            { name: '⚠️ Penalty Applied', value: `🪙 ${penaltyAmount.toLocaleString()}`, inline: true },
            { name: '🏦 New Bank Balance', value: `🪙 ${user.bank.toLocaleString()}`, inline: true }
          )
          .setTimestamp();

        await member.send({ embeds: [overdueEmbed] });
      }
    } catch (error) {
      console.error(`[LoanManager] Failed to notify user ${user.userId}:`, error);
    }

    console.log(`[LoanManager] Applied overdue penalty to user ${user.userId} in guild ${user.guildId}`);
  }
}

let loanManagerInterval = null;

function startLoanManager() {
  if (loanManagerInterval) {
    return loanManagerInterval;
  }

  processOverdueLoans().catch((error) => {
    console.error('[LoanManager] Failed to process overdue loans on startup:', error);
  });

  loanManagerInterval = setInterval(() => {
    processOverdueLoans().catch((error) => {
      console.error('[LoanManager] Failed to process overdue loans:', error);
    });
  }, 5 * 60 * 1000);

  return loanManagerInterval;
}

module.exports = {
  LOAN_TIERS,
  getLoanTerms,
  validateLoanAmount,
  clearLoanData,
  processOverdueLoans,
  startLoanManager
};
