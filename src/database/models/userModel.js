const User = require('../schemas/User');

async function findOrCreateUser(userId, guildId) {
  let user = await User.findOne({ userId, guildId });

  if (!user) {
    user = await User.create({ userId, guildId });
  }

  return user;
}

module.exports = {
  findOrCreateUser
};