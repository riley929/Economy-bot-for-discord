function getActiveGamblingMultiplier(user) {
  const boost = user.boosts?.gamblingMultiplier;

  if (!boost || !boost.expiresAt) {
    return 1;
  }

  if (new Date(boost.expiresAt).getTime() <= Date.now()) {
    return 1;
  }

  return boost.multiplier ?? 1;
}

function applyGamblingMultiplier(user, basePayout) {
  const multiplier = getActiveGamblingMultiplier(user);

  const finalPayout = Math.floor(basePayout * multiplier);

  return {
    multiplier,
    basePayout,
    finalPayout,
    bonus: finalPayout - basePayout,
  };
}

module.exports = {
  getActiveGamblingMultiplier,
  applyGamblingMultiplier,
};