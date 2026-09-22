const User = require('../../database/schemas/User');

function xpNeeded(level) {
  return Math.floor(100 * Math.pow(level, 1.4));
}

function randomXp(min = 8, max = 18) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function addXP({ userId, guildId }) {
  let user = await User.findOne({ userId, guildId });

  if (!user) {
    user = await User.create({
      userId,
      guildId,
      wallet: 0,
      bank: 0,
      xp: 0,
      level: 1,
      commandsUsed: 0,
      lastXpGain: 0
    });
  }

  const now = Date.now();

  // ⛔ Anti-spam (45 sec cooldown)
  if (now - user.lastXpGain < 45000) {
    return null;
  }

  const gained = randomXp();

  user.xp += gained;
  user.commandsUsed += 1;
  user.lastXpGain = now;

  let leveledUp = false;

  while (user.xp >= xpNeeded(user.level)) {
    user.xp -= xpNeeded(user.level);
    user.level += 1;
    leveledUp = true;
  }

  await user.save();

  return {
    gained,
    level: user.level,
    xp: user.xp,
    leveledUp
  };
}

module.exports = { addXP };