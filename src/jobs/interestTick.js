const User = require('../database/schemas/User');

const INTEREST_RATE = 0.025; // 2.5%
const MAX_INTEREST = 25000; // max interest per user per run

async function applyBankInterest(guildId = null) {
  const query = guildId ? { guildId } : {};

  const users = await User.find(query);

  let updated = 0;
  let totalInterestPaid = 0;

  for (const user of users) {
    if ((user.bank || 0) <= 0) continue;

    const interest = Math.min(
      Math.floor((user.bank || 0) * INTEREST_RATE),
      MAX_INTEREST
    );

    if (interest <= 0) continue;

    user.bank += interest;
    await user.save();

    totalInterestPaid += interest;
    updated++;
  }

  console.log(
    `🏦 Interest applied to ${updated} users. Total paid: ${totalInterestPaid.toLocaleString()} coins.`
  );

  return {
    updated,
    totalInterestPaid
  };
}

module.exports = {
  applyBankInterest
};