const symbols = ['🍒', '🍋', '🍇', '💎', '⭐', '7️⃣'];

function randomSymbol() {
  return symbols[Math.floor(Math.random() * symbols.length)];
}

function spinSlots() {
  const win = Math.random() < 0.40;

  if (win) {
    const symbol = randomSymbol();

    return {
      win: true,
      reels: [symbol, symbol, symbol],
      multiplier: 2
    };
  }

  let reels;

  do {
    reels = [randomSymbol(), randomSymbol(), randomSymbol()];
  } while (reels[0] === reels[1] && reels[1] === reels[2]);

  return {
    win: false,
    reels,
    multiplier: 0
  };
}

module.exports = {
  spinSlots
};