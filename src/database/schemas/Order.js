const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },

  userId: {
    type: String,
    required: true
  },

  guildId: {
    type: String,
    required: true
  },

  itemId: {
    type: String,
    required: true
  },

  itemName: {
    type: String,
    required: true
  },

  quantity: {
    type: Number,
    default: 1
  },

  totalPrice: {
    type: Number,
    required: true
  },

  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  },

  claimedBy: {
    type: String,
    default: null
  },

  claimedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);