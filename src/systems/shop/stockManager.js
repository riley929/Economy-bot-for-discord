const shopManager = require('./shopManager');

function hasStock(item, quantity = 1) {
  if (!item) return false;
  if (item.stock === -1) return true;
  return item.stock >= quantity;
}

function getStockText(item) {
  if (!item) return 'Unknown';
  return item.stock === -1 ? 'Unlimited' : item.stock.toLocaleString();
}

function getLowStockItems(threshold = 5) {
  return shopManager
    .getShopItems()
    .filter(item => item.stock !== -1 && item.stock <= threshold);
}

module.exports = {
  hasStock,
  getStockText,
  getLowStockItems
};