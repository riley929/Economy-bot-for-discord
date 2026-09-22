const shopManager = require('../shop/shopManager');

async function giveRole(guild, userId, roleItemId) {
  const item = shopManager.getItemById(roleItemId);

  if (!item || item.type !== 'role') {
    return {
      success: false,
      reason: 'ROLE_ITEM_NOT_FOUND'
    };
  }

  if (!item.roleId || item.roleId.includes('PUT_')) {
    return {
      success: false,
      reason: 'ROLE_ID_NOT_SET',
      item
    };
  }

  const member = await guild.members.fetch(userId).catch(() => null);

  if (!member) {
    return {
      success: false,
      reason: 'MEMBER_NOT_FOUND',
      item
    };
  }

  if (member.roles.cache.has(item.roleId)) {
    return {
      success: false,
      reason: 'ALREADY_HAS_ROLE',
      item
    };
  }

  await member.roles.add(item.roleId);

  return {
    success: true,
    item,
    member
  };
}

async function removeRole(guild, userId, roleItemId) {
  const item = shopManager.getItemById(roleItemId);

  if (!item || item.type !== 'role') {
    return {
      success: false,
      reason: 'ROLE_ITEM_NOT_FOUND'
    };
  }

  if (!item.roleId || item.roleId.includes('PUT_')) {
    return {
      success: false,
      reason: 'ROLE_ID_NOT_SET',
      item
    };
  }

  const member = await guild.members.fetch(userId).catch(() => null);

  if (!member) {
    return {
      success: false,
      reason: 'MEMBER_NOT_FOUND',
      item
    };
  }

  if (!member.roles.cache.has(item.roleId)) {
    return {
      success: false,
      reason: 'DOES_NOT_HAVE_ROLE',
      item
    };
  }

  await member.roles.remove(item.roleId);

  return {
    success: true,
    item,
    member
  };
}

module.exports = {
  giveRole,
  removeRole
};