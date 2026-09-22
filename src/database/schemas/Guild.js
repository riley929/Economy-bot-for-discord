const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true
  },

  jackpot: {
    type: Number,
    default: 0
  },

  totalMoneyBurned: {
    type: Number,
    default: 0
  },

  totalGamblingBets: {
    type: Number,
    default: 0
  },

  totalGamblingWins: {
    type: Number,
    default: 0
  },

  totalGamblingLosses: {
    type: Number,
    default: 0
  },


  panicMode: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true
});

module.exports = mongoose.model('Guild', guildSchema);