const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },

  wallet: { type: Number, default: 0 },
  bank: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  commandsUsed: { type: Number, default: 0 },
  lastXpGain: { type: Number, default: 0 },
  bets: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  lifetimeEarned: { type: Number, default: 0 },
  lifetimeSpent: { type: Number, default: 0 },
  workEarned: { type: Number, default: 0 },
  shopPurchases: { type: Number, default: 0 },
  achievements: { type: [String], default: [] },
  inventory: [{
  itemId: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    default: 1
  },
  type: {
    type: String,
    default: 'item'
  }
}],

  streak: {
    type: Number,
    default: 0
  },

  lastDaily: {
    type: Date,
    default: null
  },

items: {
  type: Map,
  of: Number,
  default: {}
},

upgrades: {
  fishingRod: { type: Number, default: 0 },
  pickaxe: { type: Number, default: 0 },
  huntingGear: { type: Number, default: 0 },
  bait: { type: Number, default: 0 },
  extraLuck: { type: Number, default: 0 },
  backpack: { type: Number, default: 0 },
  bombs: { type: Number, default: 0 }
},

  cooldowns: {
    work: { type: Date, default: null },
    daily: { type: Date, default: null },
    slots: { type: Date, default: null },
    dice: { type: Date, default: null },
    coinflip: { type: Date, default: null },
    roulette: { type: Date, default: null },
    blackjack: { type: Date, default: null },
    crash: { type: Date, default: null },
    lottery: { type: Date, default: null },
    crime: { type: Date, default: null },
    beg: { type: Date, default: null },
    weekly: { type: Date, default: null },
    steal: { type: Date, default: null },
    fish: { type: Date, default: null },
    mine: { type: Date, default: null },
    hunt: { type: Date, default: null },
    scavenge: { type: Date, default: null },
    deliver: { type: Date, default: null },
    tutor: { type: Date, default: null },
    cook: { type: Date, default: null },
    repair: { type: Date, default: null },
    highlow: { type: Date, default: null },
    carddraw: { type: Date, default: null },
    wheel: { type: Date, default: null },
    keno: { type: Date, default: null },
    plinko: { type: Date, default: null },
    baccarat: { type: Date, default: null },
    craps: { type: Date, default: null },
    darts: { type: Date, default: null },
    chohan: { type: Date, default: null },
    fortune: { type: Date, default: null }
  },
boosts: {
  workMultiplier: {
    multiplier: { type: Number, default: 1 },
    expiresAt: { type: Date, default: null }
  },

  gamblingMultiplier: {
    multiplier: { type: Number, default: 1 },
    expiresAt: { type: Date, default: null }
  }
},
  blacklisted: {
  type: Boolean,
  default: false
},

blacklistReason: {
  type: String,
  default: null
},

blacklistExpiresAt: {
  type: Date,
  default: null
},
verified: {
  type: Boolean,
  default: false
},

verifiedAt: {
  type: Date,
  default: null
},

hasLoan: {
  type: Boolean,
  default: false
},
loanAmount: {
  type: Number,
  default: 0
},
interestAmount: {
  type: Number,
  default: 0
},
repaymentAmount: {
  type: Number,
  default: 0
},
penaltyAmount: {
  type: Number,
  default: 0
},
loanTakenAt: {
  type: Date,
  default: null
},
dueDate: {
  type: Date,
  default: null
},
loanPaid: {
  type: Boolean,
  default: false
},

flags: {
  type: Number,
  default: 0
}
}, {
  timestamps: true
});

userSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports =
  mongoose.models.User || mongoose.model('User', userSchema);