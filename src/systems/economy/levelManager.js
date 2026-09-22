function xpNeeded(level) {
  return Math.floor(500 + level * 250 + Math.pow(level, 1.35) * 120);
}

function getLevelReward(level) {
  return Math.floor(1000 + level * 350);
}

function addXp(user, amount) {
  if (!user.xp) user.xp = 0;
  if (!user.level) user.level = 1;

  user.xp += amount;

  let leveledUp = false;
  let levelsGained = 0;
  let reward = 0;

  while (user.xp >= xpNeeded(user.level)) {
    user.xp -= xpNeeded(user.level);
    user.level += 1;
    levelsGained += 1;
    leveledUp = true;

    const levelReward = getLevelReward(user.level);
    user.wallet += levelReward;
    reward += levelReward;
  }

  return {
    user,
    leveledUp,
    levelsGained,
    reward,
    nextXp: xpNeeded(user.level)
  };
}

function progressBar(current, needed, size = 12) {
  const filled = Math.round((current / needed) * size);
  const empty = size - filled;

  return '🟩'.repeat(Math.max(0, filled)) + '⬛'.repeat(Math.max(0, empty));
}

module.exports = {
  xpNeeded,
  getLevelReward,
  addXp,
  progressBar
};