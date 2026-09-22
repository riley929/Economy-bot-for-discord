const Order = require('../../database/schemas/Order');

async function getPendingOrders(guildId, limit = 10) {
  return Order.find({
    guildId,
    status: 'pending'
  })
    .sort({ createdAt: 1 })
    .limit(limit);
}

async function getQueuePosition(orderId, guildId) {
  const orders = await Order.find({
    guildId,
    status: 'pending'
  }).sort({ createdAt: 1 });

  const index = orders.findIndex(order => order.orderId === orderId.toUpperCase());

  if (index === -1) return null;

  return index + 1;
}

module.exports = {
  getPendingOrders,
  getQueuePosition
};