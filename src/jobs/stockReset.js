function resetDailyStock() {
  console.log('📦 Stock reset job ran.');

  return {
    success: true,
    message: 'Stock reset placeholder complete.'
  };
}

module.exports = {
  resetDailyStock
};