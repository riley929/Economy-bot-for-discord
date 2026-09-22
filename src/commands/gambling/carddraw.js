const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../../systems/economy/economyManager');
const { checkRate } = require('../../systems/antiAbuse/rateLimiter');
const { checkBet } = require('../../systems/antiAbuse/fraudCheck');
const { flag } = require('../../systems/antiAbuse/exploitDetector');
const { addGamblingStat } = require('../../systems/gambling/jackpotManager');
const { MIN_BET, MAX_BET, COOLDOWNS, MULTIPLIERS } = require('../../config/gambling');
const { notEnoughMoney, rateLimited } = require('../../utils/errors');
const { sendLog } = require('../../utils/logger');
const { applyGamblingMultiplier } = require('../../systems/gambling/gamblingMultiplier');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function cardName(value) {
  if (value === 1) return 'Ace';
  if (value === 11) return 'Jack';
  if (value === 12) return 'Queen';
  if (value === 13) return 'King';
  return value.toString();
}

function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('carddraw')
    .setDescription('Draw a card against the dealer')
    .addIntegerOption(option =>
      option
        .setName('bet')
        .setDescription('Amount to bet')
        .setRequired(true)
        .setMinValue(MIN_BET)
        .setMaxValue(MAX_BET)
    ),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    if (!checkRate(interaction.user.id, 'carddraw')) {
      await flag(interaction.user.id, interaction.guild.id, 'Rate limit hit on carddraw');
      return interaction.editReply({ embeds: [rateLimited()] });
    }

    const bet = interaction.options.getInteger('bet');
    const user = await economy.getUser(interaction.user.id, interaction.guild.id);

    const last = user.cooldowns.carddraw ? user.cooldowns.carddraw.getTime() : 0;
    const now = Date.now();
    const remaining = COOLDOWNS.carddraw - (now - last);

    if (remaining > 0) {
      const endTime = last + COOLDOWNS.carddraw;
      const timeLeft = Math.max(endTime - Date.now(), 0);
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#fee75c')
            .setTitle('⏳ CardDraw Cooldown')
            .setDescription(`You must wait **${formatTime(timeLeft)}** before drawing again.`)
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp()
        ]
      });
    }

    if (!checkBet(user, bet)) {
      await flag(interaction.user.id, interaction.guild.id, `Invalid carddraw bet: ${bet}`);
      return interaction.editReply({ embeds: [notEnoughMoney(bet, user)] });
    }

    const win = Math.random() < 0.4;
    let playerCard;
    let dealerCard;

    if (win) {
      playerCard = randomInt(8, 13);
      dealerCard = randomInt(1, playerCard - 1);
    } else {
      dealerCard = randomInt(7, 13);
      playerCard = randomInt(1, dealerCard - 1);
    }

    const result = win ? 'win' : 'loss';
    user.wallet -= bet;
    user.cooldowns.carddraw = new Date();
    user.bets = (user.bets || 0) + 1;

    let payout = 0;
    let color = '#ed4245';
    let description = `You drew **${cardName(playerCard)}** while the dealer drew **${cardName(dealerCard)}**. You lost **${bet.toLocaleString()} coins**.`;
    if (win) {
      const basePayout = Math.floor(bet * MULTIPLIERS.carddraw);
      const { multiplier, finalPayout, bonus } = applyGamblingMultiplier(user, basePayout);
      payout = finalPayout;
      user.wallet += payout;
      user.wins = (user.wins || 0) + 1;
      color = '#57f287';
      description = `You drew **${cardName(playerCard)}** and beat the dealer's **${cardName(dealerCard)}**. You won **${payout.toLocaleString()} coins**!`;
    } else {
      user.losses = (user.losses || 0) + 1;
    }

    await user.save();
    await addGamblingStat(interaction.guild.id, result, bet, payout);

    await sendLog(interaction, {
      title: '🂡 CardDraw',
      color,
      fields: [
        { name: 'Player Card', value: `**${cardName(playerCard)}**`, inline: true },
        { name: 'Dealer Card', value: `**${cardName(dealerCard)}**`, inline: true },
        { name: 'Bet', value: `**${bet.toLocaleString()}** coins`, inline: true },
        { name: 'Outcome', value: result.toUpperCase(), inline: true },
        { name: 'Payout', value: `**${payout.toLocaleString()}** coins`, inline: true }
      ]
    });

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('🂡 CardDraw')
      .setDescription(description)
      .addFields(
        { name: '🧍 Your Card', value: `**${cardName(playerCard)}**`, inline: true },
        { name: '🤖 Dealer Card', value: `**${cardName(dealerCard)}**`, inline: true },
        { name: '💰 Bet', value: `**${bet.toLocaleString()}** coins`, inline: true },
        { name: '💸 Wallet', value: `**${user.wallet.toLocaleString()}** coins`, inline: true }
      )
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};
