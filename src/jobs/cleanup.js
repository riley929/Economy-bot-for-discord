const Order = require('../database/schemas/Order');

async function cleanupOldCancelledOrders(days = 30) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const result = await Order.deleteMany({
    status: 'cancelled',
    updatedAt: { $lt: cutoff }
  });

  console.log(`🧹 Cleanup removed ${result.deletedCount} old cancelled orders.`);
  return result.deletedCount;
}

module.exports = {
  cleanupOldCancelledOrders
};