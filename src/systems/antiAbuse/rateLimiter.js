const limits = new Map();

function checkRate(userId, command, limit = 3, time = 10_000) {
  const key = `${userId}_${command}`;
  const now = Date.now();

  if (!limits.has(key)) {
    limits.set(key, []);
  }

  const timestamps = limits
    .get(key)
    .filter(timestamp => now - timestamp < time);

  timestamps.push(now);
  limits.set(key, timestamps);

  return timestamps.length <= limit;
}

function getRateCount(userId, command, time = 10_000) {
  const key = `${userId}_${command}`;
  const now = Date.now();

  if (!limits.has(key)) return 0;

  const timestamps = limits
    .get(key)
    .filter(timestamp => now - timestamp < time);

  limits.set(key, timestamps);

  return timestamps.length;
}

module.exports = {
  checkRate,
  getRateCount
};