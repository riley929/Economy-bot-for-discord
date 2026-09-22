const { EmbedBuilder } = require('discord.js');

function notEnoughMoney(bet, user) {
  return new EmbedBuilder()
    .setColor('#ed4245')
    .setTitle('❌ Not Enough Money')
    .setDescription(
      `You tried to bet **${bet.toLocaleString()} coins**, but you only have **${user.wallet.toLocaleString()} coins** in your wallet.\n\n` +
      `Withdraw money from your bank first using:\n` +
      `\`/withdraw amount:all\`\n\n` +
      `Or choose a smaller bet.`
    );
}

function basicError(message) {
  return new EmbedBuilder()
    .setColor('#ed4245')
    .setTitle('❌ Error')
    .setDescription(message);
}

function cooldown(seconds) {
  return new EmbedBuilder()
    .setColor('#fee75c')
    .setTitle('⏳ Slow Down')
    .setDescription(`Try again in **${seconds}s**.`);
}

function rateLimited() {
  return new EmbedBuilder()
    .setColor('#fee75c')
    .setTitle('⚠️ Slow Down')
    .setDescription('You are using this too fast.');
}

module.exports = {
  notEnoughMoney,
  basicError,
  cooldown,
  rateLimited
};