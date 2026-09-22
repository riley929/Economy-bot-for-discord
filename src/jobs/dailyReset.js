async function runDailyReset() {
  console.log('🔁 Daily reset job ran.');

  return {
    success: true,
    message: 'Daily reset placeholder complete.'
  };
}

module.exports = {
  runDailyReset
};