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

const SEGMENTS = [
  { name: 'Gold', emoji: '🟡', win: true },
  { name: 'Red', emoji: '🔴', win: true },
  { name: 'Blue', emoji: '🔵', win: false },
  { name: 'Green', emoji: '🟢', win: false },
  { name: 'Black', emoji: '⚫', win: false }
];

function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wheel')
    .setDescription('Spin the wheel and bet on a winning segment')
    .addStringOption(option =>
      option
        .setName('segment')
        .setDescription('Choose a wheel segment')
        .setRequired(true)
        .addChoices(
          ...SEGMENTS.map(segment => ({ name: segment.name, value: segment.name.toLowerCase() }))
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

    if (!checkRate(interaction.user.id, 'wheel')) {
      await flag(interaction.user.id, interaction.guild.id, 'Rate limit hit on wheel');
      return interaction.editReply({ embeds: [rateLimited()] });
    }

    const segmentChoice = interaction.options.getString('segment');
    const bet = interaction.options.getInteger('bet');
    const user = await economy.getUser(interaction.user.id, interaction.guild.id);

    const last = user.cooldowns.wheel ? user.cooldowns.wheel.getTime() : 0;
    const now = Date.now();
    const remaining = COOLDOWNS.wheel - (now - last);

    if (remaining > 0) {
      const endTime = last + COOLDOWNS.wheel;
      const timeLeft = Math.max(endTime - Date.now(), 0);
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#fee75c')
            .setTitle('⏳ Wheel Cooldown')
            .setDescription(`Your next spin is available in **${formatTime(timeLeft)}**.`)
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp()
        ]
      });
    }

    if (!checkBet(user, bet)) {
      await flag(interaction.user.id, interaction.guild.id, `Invalid wheel bet: ${bet}`);
      return interaction.editReply({ embeds: [notEnoughMoney(bet, user)] });
    }

    const win = Math.random() < 0.4;
    const winningSegment = SEGMENTS[Math.floor(Math.random() * SEGMENTS.length)];
    const resultSegment = win ? SEGMENTS.find(item => item.win && item.name.toLowerCase() === segmentChoice) || winningSegment : SEGMENTS.find(item => item.name.toLowerCase() !== segmentChoice) || winningSegment;

    const actual = win ? segmentChoice : resultSegment.name.toLowerCase();
    const passed = win && segmentChoice === actual;

    user.wallet -= bet;
    user.cooldowns.wheel = new Date();
    user.bets = (user.bets || 0) + 1;

    let payout = 0;
    let color = '#ed4245';
    let description = `The wheel landed on **${resultSegment.emoji} ${resultSegment.name}**. You lost **${bet.toLocaleString()} coins**.`;
    if (passed) {
      const basePayout = Math.floor(bet * MULTIPLIERS.wheel);
      const { multiplier, finalPayout, bonus } = applyGamblingMultiplier(user, basePayout);
      payout = finalPayout;
      user.wallet += payout;
      user.wins = (user.wins || 0) + 1;
      color = '#57f287';
      description = `The wheel landed on **${resultSegment.emoji} ${resultSegment.name}** and you won **${payout.toLocaleString()} coins**!`;
    } else {
      user.losses = (user.losses || 0) + 1;
    }

    await user.save();
    await addGamblingStat(interaction.guild.id, passed ? 'win' : 'loss', bet, payout);

    await sendLog(interaction, {
      title: '🎡 Wheel',
      color,
      fields: [
        { name: 'Choice', value: `**${segmentChoice}**`, inline: true },
        { name: 'Result', value: `**${resultSegment.name}**`, inline: true },
        { name: 'Bet', value: `**${bet.toLocaleString()}** coins`, inline: true },
        { name: 'Outcome', value: passed ? 'WIN' : 'LOSS', inline: true },
        { name: 'Payout', value: `**${payout.toLocaleString()}** coins`, inline: true }
      ]
    });

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('🎡 Wheel')
      .setDescription(description)
      .addFields(
        { name: '🎯 Picked', value: `**${segmentChoice}**`, inline: true },
        { name: '🎯 Landed', value: `**${resultSegment.name}**`, inline: true },
        { name: '💰 Bet', value: `**${bet.toLocaleString()}** coins`, inline: true },
        { name: '💸 Wallet', value: `**${user.wallet.toLocaleString()}** coins`, inline: true }
      )
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};
