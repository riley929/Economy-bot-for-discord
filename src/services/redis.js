function getRedis() {
  console.warn('Redis is not configured yet. Using in-memory systems.');
  return null;
}

module.exports = {
  getRedis
};