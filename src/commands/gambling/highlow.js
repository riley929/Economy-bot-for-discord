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
    .setName('highlow')
    .setDescription('Bet on a high or low draw')
    .addStringOption(option =>
      option
        .setName('choice')
        .setDescription('Pick high or low')
        .setRequired(true)
        .addChoices(
          { name: 'High', value: 'high' },
          { name: 'Low', value: 'low' }
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

    if (!checkRate(interaction.user.id, 'highlow')) {
      await flag(interaction.user.id, interaction.guild.id, 'Rate limit hit on highlow');
      return interaction.editReply({ embeds: [rateLimited()] });
    }

    const choice = interaction.options.getString('choice');
    const bet = interaction.options.getInteger('bet');
    const user = await economy.getUser(interaction.user.id, interaction.guild.id);

    const last = user.cooldowns.highlow ? user.cooldowns.highlow.getTime() : 0;
    const now = Date.now();
    const remaining = COOLDOWNS.highlow - (now - last);

    if (remaining > 0) {
      const endTime = last + COOLDOWNS.highlow;
      const timeLeft = Math.max(endTime - Date.now(), 0);
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#fee75c')
            .setTitle('⏳ HighLow Cooldown')
            .setDescription(`Your next HighLow bet is available in **${formatTime(timeLeft)}**.`)
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp()
        ]
      });
    }

    if (!checkBet(user, bet)) {
      await flag(interaction.user.id, interaction.guild.id, `Invalid highlow bet: ${bet}`);
      return interaction.editReply({ embeds: [notEnoughMoney(bet, user)] });
    }

    const win = Math.random() < 0.4;
    const draw = win ? randomInt(choice === 'high' ? 60 : 1, choice === 'high' ? 100 : 40) : randomInt(choice === 'high' ? 1 : 61, choice === 'high' ? 40 : 100);
    const outcome = win ? 'win' : 'loss';
    user.cooldowns.highlow = new Date();
    user.wallet -= bet;
    user.bets = (user.bets || 0) + 1;

    let payout = 0;
    let color = '#ed4245';
    let description = `The draw was **${draw}** and you lost **${bet.toLocaleString()} coins**.`;
    if (win) {
      const basePayout = Math.floor(bet * MULTIPLIERS.highlow);
      const { multiplier, finalPayout, bonus } = applyGamblingMultiplier(user, basePayout);
      payout = finalPayout;
      user.wallet += payout;
      user.wins = (user.wins || 0) + 1;
      color = '#57f287';
      description = `The draw was **${draw}** and you won **${payout.toLocaleString()} coins**!`;
    } else {
      user.losses = (user.losses || 0) + 1;
    }

    await user.save();
    await addGamblingStat(interaction.guild.id, outcome, bet, payout);

    await sendLog(interaction, {
      title: '🎯 HighLow',
      color,
      fields: [
        { name: 'Choice', value: `**${choice}**`, inline: true },
        { name: 'Draw', value: `**${draw}**`, inline: true },
        { name: 'Bet', value: `**${bet.toLocaleString()}** coins`, inline: true },
        { name: 'Outcome', value: outcome.toUpperCase(), inline: true },
        { name: 'Payout', value: `**${payout.toLocaleString()}** coins`, inline: true }
      ]
    });

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('🎯 HighLow')
      .setDescription(description)
      .addFields(
        { name: '🎲 Draw', value: `**${draw}**`, inline: true },
        { name: '💰 Bet', value: `**${bet.toLocaleString()}** coins`, inline: true },
        { name: '💸 Wallet', value: `**${user.wallet.toLocaleString()}** coins`, inline: true }
      )
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    if (win && payout > bet) {
      embed.addFields({ name: '⚡ Multiplier', value: `**${MULTIPLIERS.highlow}x**`, inline: true });
    }

    return interaction.editReply({ embeds: [embed] });
  }
};
