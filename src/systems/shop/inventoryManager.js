function addItem(user, item, quantity = 1) {
  const existing = user.inventory.find(i => i.itemId === item.id);

  if (existing) {
    existing.quantity += quantity;
  } else {
    user.inventory.push({
      itemId: item.id,
      name: item.name,
      type: item.type,
      quantity,
      boughtAt: new Date()
    });
  }

  return user;
}

function removeItem(user, itemId, quantity = 1) {
  const existing = user.inventory.find(i => i.itemId === itemId);

  if (!existing || existing.quantity < quantity) {
    return false;
  }

  existing.quantity -= quantity;

  if (existing.quantity <= 0) {
    user.inventory = user.inventory.filter(i => i.itemId !== itemId);
  }

  return true;
}

module.exports = {
  addItem,
  removeItem
};