const items = require('../../assets/items.json');

function getItems() {
  return items;
}

function getItem(id) {
  return items.find(item => item.id === id);
}

module.exports = {
  getItems,
  getItem
};