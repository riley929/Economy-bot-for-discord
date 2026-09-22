const User = require('../../database/schemas/User');

async function getUser(userId, guildId) {
  let user = await User.findOne({ userId, guildId });

  if (!user) {
    user = await User.create({
      userId,
      guildId,
      wallet: 0,
      bank: 0
    });
  }

  return user;
}

async function addMoney(userId, guildId, amount, options = {}) {
  const user = await getUser(userId, guildId);
  user.wallet += amount;

  if (options.trackLifetime !== false) {
    user.lifetimeEarned = (user.lifetimeEarned || 0) + amount;
  }

  await user.save();
  return user;
}

async function removeMoney(userId, guildId, amount, options = {}) {
  const user = await getUser(userId, guildId);

  if (user.wallet < amount) {
    return { success: false, user };
  }

  user.wallet -= amount;
  if (options.trackLifetime !== false) {
    user.lifetimeSpent = (user.lifetimeSpent || 0) + amount;
  }

  await user.save();

  return { success: true, user };
}

async function getBalance(userId, guildId) {
  return await getUser(userId, guildId);
}

function getNetWorth(user) {
  if (!user) return 0;
  return (user.wallet || 0) + (user.bank || 0);
}

function applyTax(amount, percent = 0.05) {
  return Math.floor(amount * (1 - percent));
}

function getTaxAmount(amount, percent = 0.05) {
  return amount - applyTax(amount, percent);
}

module.exports = {
  getUser,
  addMoney,
  removeMoney,
  getBalance,
  applyTax,
  getTaxAmount
};