module.exports = {
  MIN_BET: 50,
  MAX_BET: 25000,

  COOLDOWNS: {
    slots: 15000,
    dice: 10000,
    coinflip: 10000,
    roulette: 12000,
    blackjack: 15000,
    crash: 15000,
    lottery: 30 * 60 * 1000,
    highlow: 10000,
    carddraw: 12000,
    wheel: 15000,
    keno: 20000,
    plinko: 15000,
    baccarat: 15000,
    craps: 12000,
    darts: 12000,
    chohan: 10000,
    fortune: 12000
  },

  MULTIPLIERS: {
    coinflip: 1.85,
    dice: 1.8,
    rouletteColor: 1.8,
    rouletteOddEven: 1.8,
    rouletteGreen: 10,
    rouletteNumber: 15,
    blackjackWin: 1.9,
    blackjackBlackjack: 2.3,
    highlow: 1.9,
    carddraw: 2.0,
    wheel: 1.8,
    keno: 3.2,
    plinko: 2.0,
    baccarat: 1.85,
    craps: 1.9,
    darts: 1.8,
    chohan: 1.85,
    fortune: 1.9
  },

  BLACKJACK_ODDS: {
    winChance: 0.35,
    lossChance: 0.65
  },

  JACKPOT: {
    chance: 1 / 1000000,
    lossContribution: 0.1
  }
};