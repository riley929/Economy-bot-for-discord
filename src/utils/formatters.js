function formatMoney(amount) {
  return Number(amount || 0).toLocaleString();
}

function formatTime(ms) {
  if (ms <= 0) return '0s';

  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];

  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (secs && !days) parts.push(`${secs}s`);

  return parts.join(' ');
}

module.exports = {
  formatMoney,
  formatTime
};