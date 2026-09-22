const orderManager = require('./orderManager');

async function fulfillOrder(orderId, staffId, guildId) {
  return orderManager.completeOrder(orderId, staffId, guildId);
}

module.exports = {
  fulfillOrder
};