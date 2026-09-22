const Guild = require('../../database/schemas/Guild');

async function getGuildData(guildId) {
  let guild = await Guild.findOne({ guildId });

  if (!guild) {
    guild = await Guild.create({
      guildId,
      jackpot: 0
    });
  }

  return guild;
}

async function addToJackpot(guildId, amount) {
  const guild = await getGuildData(guildId);

  guild.jackpot += amount;
  guild.totalMoneyBurned += amount;

  await guild.save();

  return guild.jackpot;
}

async function getJackpot(guildId) {
  const guild = await getGuildData(guildId);
  return guild.jackpot;
}

async function resetJackpot(guildId) {
  const guild = await getGuildData(guildId);

  const oldJackpot = guild.jackpot;
  guild.jackpot = 0;

  await guild.save();

  return oldJackpot;
}

async function addGamblingStat(guildId, outcome, bet = 0, payout = 0) {
  const guild = await getGuildData(guildId);

  guild.totalGamblingBets += 1;

  if (outcome === 'win') guild.totalGamblingWins += 1;
  if (outcome === 'loss') guild.totalGamblingLosses += 1;

  if (payout < bet) {
    guild.totalMoneyBurned += bet - payout;
  }

  await guild.save();

  return guild;
}

module.exports = {
  getGuildData,
  addToJackpot,
  getJackpot,
  resetJackpot,
  addGamblingStat
};