const { MIN_BET, MAX_BET } = require('../../config/gambling');

function checkBet(user, bet, maxBet = MAX_BET) {
  if (!user) return false;
  if (!Number.isInteger(bet)) return false;
  if (bet < MIN_BET) return false;
  if (bet > maxBet) return false;
  if (bet > (user.wallet || 0)) return false;

  return true;
}

function checkMoneyAmount(amount) {
  if (!Number.isInteger(amount)) return false;
  if (amount <= 0) return false;
  if (amount > 100000000) return false;

  return true;
}

module.exports = {
  checkBet,
  checkMoneyAmount
};