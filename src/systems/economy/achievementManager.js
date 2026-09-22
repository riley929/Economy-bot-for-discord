const ACHIEVEMENTS = {
  daily_streak_7: {
    name: 'Consistent Cadence',
    description: 'Claim daily rewards 7 days in a row.',
    emoji: '🔥'
  },
  daily_streak_30: {
    name: 'Unbroken Focus',
    description: 'Claim daily rewards 30 days in a row.',
    emoji: '💎'
  },
  work_earned_10000: {
    name: 'Hustler',
    description: 'Earn 10,000 coins from work.',
    emoji: '💼'
  },
  work_earned_50000: {
    name: 'Grind Master',
    description: 'Earn 50,000 coins from work.',
    emoji: '⚙️'
  },
  rich_million: {
    name: 'Millionaire',
    description: 'Reach 1,000,000 total net worth.',
    emoji: '🏦'
  },
  shrewd_shopper: {
    name: 'Shrewd Shopper',
    description: 'Buy 5 shop upgrades or consumables.',
    emoji: '🛍️'
  },
  boost_user: {
    name: 'Power User',
    description: 'Use a boost item successfully.',
    emoji: '⚡'
  },
  lucky_break: {
    name: 'Lucky Break',
    description: 'Open a mystery box and score big.',
    emoji: '🎁'
  },
  jackpot_winner: {
    name: 'Bank Breaker',
    description: 'Hit the casino jackpot.',
    emoji: '💎'
  }
};

function awardAchievement(user, achievementId) {
  if (!ACHIEVEMENTS[achievementId]) return false;

  user.achievements = user.achievements || [];

  if (user.achievements.includes(achievementId)) {
    return false;
  }

  user.achievements.push(achievementId);
  return true;
}

function awardAchievements(user, achievementIds) {
  const unlocked = [];

  for (const achievementId of achievementIds) {
    if (awardAchievement(user, achievementId)) {
      unlocked.push(achievementId);
    }
  }

  return unlocked;
}

function formatAchievements(user) {
  const ids = user.achievements || [];
  if (!ids.length) return ['No achievements yet.'];

  return ids.map(id => {
    const achievement = ACHIEVEMENTS[id];
    if (!achievement) return `🏅 ${id}`;
    return `${achievement.emoji} ${achievement.name}`;
  });
}

function getAchievementNames(user) {
  return (user.achievements || []).map(id => ACHIEVEMENTS[id]?.name || id);
}

module.exports = {
  ACHIEVEMENTS,
  awardAchievement,
  awardAchievements,
  formatAchievements,
  getAchievementNames
};
