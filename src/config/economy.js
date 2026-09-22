module.exports = {
  WORK: {
    minPay: 200,
    maxPay: 500,
    cooldown: 60 * 60 * 1000
  },

  DAILY: {
    baseReward: 1000,
    streakBonus: 100,
    milestoneEvery: 7,
    milestoneBonus: 2500,
    cooldown: 24 * 60 * 60 * 1000,
    resetAfter: 48 * 60 * 60 * 1000
  },

  TRANSFER: {
    tax: 0.05,
    maxTransfer: 250000
  }
};