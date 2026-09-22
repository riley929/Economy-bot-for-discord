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
    .setName('chohan')
    .setDescription('Bet on whether the dice total is even or odd')
    .addStringOption(option =>
      option
        .setName('choice')
        .setDescription('Pick even or odd')
        .setRequired(true)
        .addChoices(
          { name: 'Even', value: 'even' },
          { name: 'Odd', value: 'odd' }
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

    if (!checkRate(interaction.user.id, 'chohan')) {
      await flag(interaction.user.id, interaction.guild.id, 'Rate limit hit on chohan');
      return interaction.editReply({ embeds: [rateLimited()] });
    }

    const choice = interaction.options.getString('choice');
    const bet = interaction.options.getInteger('bet');
    const user = await economy.getUser(interaction.user.id, interaction.guild.id);

    const last = user.cooldowns.chohan ? user.cooldowns.chohan.getTime() : 0;
    const now = Date.now();
    const remaining = COOLDOWNS.chohan - (now - last);

    if (remaining > 0) {
      const endTime = last + COOLDOWNS.chohan;
      const timeLeft = Math.max(endTime - Date.now(), 0);
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#fee75c')
            .setTitle('⏳ Chohan Cooldown')
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
      await flag(interaction.user.id, interaction.guild.id, `Invalid chohan bet: ${bet}`);
      return interaction.editReply({ embeds: [notEnoughMoney(bet, user)] });
    }

    const die1 = randomInt(1, 6);
    const die2 = randomInt(1, 6);
    const total = die1 + die2;
    const result = total % 2 === 0 ? 'even' : 'odd';
    const success = result === choice && Math.random() < 0.4;

    user.wallet -= bet;
    user.cooldowns.chohan = new Date();
    user.bets = (user.bets || 0) + 1;

    let payout = 0;
    let color = '#ed4245';
    let description = `The dice total was **${total}** and you lost **${bet.toLocaleString()} coins**.`;
    if (success) {
      const basePayout = Math.floor(bet * MULTIPLIERS.chohan);
      const { multiplier, finalPayout, bonus } = applyGamblingMultiplier(user, basePayout);
      payout = finalPayout;
      user.wallet += payout;
      user.wins = (user.wins || 0) + 1;
      color = '#57f287';
      description = `The dice total was **${total}** and you won **${payout.toLocaleString()} coins**!`;
    } else {
      user.losses = (user.losses || 0) + 1;
    }

    await user.save();
    await addGamblingStat(interaction.guild.id, success ? 'win' : 'loss', bet, payout);

    await sendLog(interaction, {
      title: '🎲 Chohan',
      color,
      fields: [
        { name: 'Choice', value: `**${choice}**`, inline: true },
        { name: 'Dice Total', value: `**${total}**`, inline: true },
        { name: 'Result', value: `**${result}**`, inline: true },
        { name: 'Bet', value: `**${bet.toLocaleString()}** coins`, inline: true },
        { name: 'Payout', value: `**${payout.toLocaleString()}** coins`, inline: true }
      ]
    });

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('🎲 Chohan')
      .setDescription(description)
      .addFields(
        { name: '🎲 Dice Roll', value: `**${die1} + ${die2} = ${total}**`, inline: true },
        { name: '💰 Bet', value: `**${bet.toLocaleString()}** coins`, inline: true },
        { name: '💸 Wallet', value: `**${user.wallet.toLocaleString()}** coins`, inline: true }
      )
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};
