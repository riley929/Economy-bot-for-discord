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

function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('darts')
    .setDescription('Throw a dart and bet on the score range')
    .addStringOption(option =>
      option
        .setName('range')
        .setDescription('Choose a score range')
        .setRequired(true)
        .addChoices(
          { name: 'Miss (1-10)', value: 'miss' },
          { name: 'Low (11-20)', value: 'low' },
          { name: 'Mid (21-30)', value: 'mid' },
          { name: 'High (31-40)', value: 'high' }
        )
    )
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

    if (!checkRate(interaction.user.id, 'darts')) {
      await flag(interaction.user.id, interaction.guild.id, 'Rate limit hit on darts');
      return interaction.editReply({ embeds: [rateLimited()] });
    }

    const range = interaction.options.getString('range');
    const bet = interaction.options.getInteger('bet');
    const user = await economy.getUser(interaction.user.id, interaction.guild.id);

    const last = user.cooldowns.darts ? user.cooldowns.darts.getTime() : 0;
    const now = Date.now();
    const remaining = COOLDOWNS.darts - (now - last);

    if (remaining > 0) {
      const endTime = last + COOLDOWNS.darts;
      const timeLeft = Math.max(endTime - Date.now(), 0);
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#fee75c')
            .setTitle('⏳ Darts Cooldown')
            .setDescription(`Try again in **${formatTime(timeLeft)}**.`)
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp()
        ]
      });
    }

    if (!checkBet(user, bet)) {
      await flag(interaction.user.id, interaction.guild.id, `Invalid darts bet: ${bet}`);
      return interaction.editReply({ embeds: [notEnoughMoney(bet, user)] });
    }

    const score = randomInt(1, 40);
    const success =
      (range === 'miss' && score <= 10) ||
      (range === 'low' && score <= 20 && score > 10) ||
      (range === 'mid' && score <= 30 && score > 20) ||
      (range === 'high' && score > 30);

    const weightedWin = Math.random() < 0.4;
    const finalSuccess = success && weightedWin;

    user.wallet -= bet;
    user.cooldowns.darts = new Date();
    user.bets = (user.bets || 0) + 1;

    let payout = 0;
    let color = '#ed4245';
    let description = `You scored **${score}** and lost **${bet.toLocaleString()} coins**.`;
    if (finalSuccess) {
      const basePayout = Math.floor(bet * MULTIPLIERS.darts);
      const { multiplier, finalPayout, bonus } = applyGamblingMultiplier(user, basePayout);
      payout = finalPayout;
      user.wallet += payout;
      user.wins = (user.wins || 0) + 1;
      color = '#57f287';
      description = `You scored **${score}** and won **${payout.toLocaleString()} coins**!`;
    } else {
      user.losses = (user.losses || 0) + 1;
    }

    await user.save();
    await addGamblingStat(interaction.guild.id, finalSuccess ? 'win' : 'loss', bet, payout);

    await sendLog(interaction, {
      title: '🎯 Darts',
      color,
      fields: [
        { name: 'Range', value: `**${range}**`, inline: true },
        { name: 'Score', value: `**${score}**`, inline: true },
        { name: 'Bet', value: `**${bet.toLocaleString()}** coins`, inline: true },
        { name: 'Outcome', value: finalSuccess ? 'WIN' : 'LOSS', inline: true },
        { name: 'Payout', value: `**${payout.toLocaleString()}** coins`, inline: true }
      ]
    });

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('🎯 Darts')
      .setDescription(description)
      .addFields(
        { name: 'Range', value: `**${range}**`, inline: true },
        { name: 'Score', value: `**${score}**`, inline: true },
        { name: '💰 Bet', value: `**${bet.toLocaleString()}** coins`, inline: true },
        { name: '💸 Wallet', value: `**${user.wallet.toLocaleString()}** coins`, inline: true }
      )
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};
