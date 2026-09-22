const economy = require('../economy/economyManager');
const shopManager = require('../shop/shopManager');

async function syncUserRoles(guild, userId) {
  const user = await economy.getUser(userId, guild.id);
  const member = await guild.members.fetch(userId).catch(() => null);

  if (!member) {
    return {
      success: false,
      reason: 'MEMBER_NOT_FOUND'
    };
  }

  const roleItems = user.inventory.filter(item => item.type === 'role');
  const synced = [];
  const failed = [];

  for (const owned of roleItems) {
    const shopItem = shopManager.getItemById(owned.itemId);

    if (!shopItem?.roleId || shopItem.roleId.includes('PUT_')) {
      failed.push(owned.itemId);
      continue;
    }

    if (!member.roles.cache.has(shopItem.roleId)) {
      await member.roles.add(shopItem.roleId).catch(() => {
        failed.push(owned.itemId);
      });

      synced.push(owned.itemId);
    }
  }

  return {
    success: true,
    synced,
    failed
  };
}

module.exports = {
  syncUserRoles
};