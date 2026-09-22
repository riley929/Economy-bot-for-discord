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

const SLOTS = [
  { value: 1, label: 'Left', win: false },
  { value: 2, label: 'Middle Left', win: false },
  { value: 3, label: 'Center', win: true },
  { value: 4, label: 'Middle Right', win: true },
  { value: 5, label: 'Right', win: false }
];

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
    .setName('plinko')
    .setDescription('Drop a chip and hope it lands in a winning slot')
    .addIntegerOption(option =>
      option
        .setName('slot')
        .setDescription('Pick a slot from 1 to 5')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(5)
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

    if (!checkRate(interaction.user.id, 'plinko')) {
      await flag(interaction.user.id, interaction.guild.id, 'Rate limit hit on plinko');
      return interaction.editReply({ embeds: [rateLimited()] });
    }

    const slotChoice = interaction.options.getInteger('slot');
    const bet = interaction.options.getInteger('bet');
    const user = await economy.getUser(interaction.user.id, interaction.guild.id);

    const last = user.cooldowns.plinko ? user.cooldowns.plinko.getTime() : 0;
    const now = Date.now();
    const remaining = COOLDOWNS.plinko - (now - last);

    if (remaining > 0) {
      const endTime = last + COOLDOWNS.plinko;
      const timeLeft = Math.max(endTime - Date.now(), 0);
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#fee75c')
            .setTitle('⏳ Plinko Cooldown')
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
      await flag(interaction.user.id, interaction.guild.id, `Invalid plinko bet: ${bet}`);
      return interaction.editReply({ embeds: [notEnoughMoney(bet, user)] });
    }

    const win = Math.random() < 0.4;
    const slide = win ? SLOTS.find(slot => slot.win) : SLOTS.find(slot => !slot.win);
    const chosen = SLOTS.find(slot => slot.value === slotChoice) || SLOTS[0];

    user.wallet -= bet;
    user.cooldowns.plinko = new Date();
    user.bets = (user.bets || 0) + 1;

    let payout = 0;
    let color = '#ed4245';
    let description = `Your chip landed in **${slide.label}** and you lost **${bet.toLocaleString()} coins**.`;
    if (win && chosen.win) {
      const basePayout = Math.floor(bet * MULTIPLIERS.plinko);
      const { multiplier, finalPayout, bonus } = applyGamblingMultiplier(user, basePayout);
      payout = finalPayout;
      user.wallet += payout;
      user.wins = (user.wins || 0) + 1;
      color = '#57f287';
      description = `Your chip landed in **${slide.label}** and you won **${payout.toLocaleString()} coins**!`;
    } else {
      user.losses = (user.losses || 0) + 1;
    }

    await user.save();
    await addGamblingStat(interaction.guild.id, win && chosen.win ? 'win' : 'loss', bet, payout);

    await sendLog(interaction, {
      title: '🧩 Plinko',
      color,
      fields: [
        { name: 'Picked Slot', value: `**${slotChoice}**`, inline: true },
        { name: 'Landed', value: `**${slide.label}**`, inline: true },
        { name: 'Bet', value: `**${bet.toLocaleString()}** coins`, inline: true },
        { name: 'Outcome', value: win && chosen.win ? 'WIN' : 'LOSS', inline: true },
        { name: 'Payout', value: `**${payout.toLocaleString()}** coins`, inline: true }
      ]
    });

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('🧩 Plinko')
      .setDescription(description)
      .addFields(
        { name: '🎯 Picked Slot', value: `**${slotChoice}**`, inline: true },
        { name: '🎯 Landed', value: `**${slide.label}**`, inline: true },
        { name: '💰 Bet', value: `**${bet.toLocaleString()}** coins`, inline: true },
        { name: '💸 Wallet', value: `**${user.wallet.toLocaleString()}** coins`, inline: true }
      )
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};
