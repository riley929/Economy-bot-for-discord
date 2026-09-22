const User = require('../schemas/User');

async function getTotalMoney(guildId) {
  const users = await User.find({ guildId });

  return users.reduce((total, user) => {
    return total + user.wallet + user.bank;
  }, 0);
}

async function getRichestUsers(guildId, limit = 10) {
  return User.find({ guildId })
    .sort({ wallet: -1, bank: -1 })
    .limit(limit);
}

module.exports = {
  getTotalMoney,
  getRichestUsers
};