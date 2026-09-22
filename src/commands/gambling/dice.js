const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../../systems/economy/economyManager");
const { checkRate } = require("../../systems/antiAbuse/rateLimiter");
const { checkBet } = require("../../systems/antiAbuse/fraudCheck");
const { flag } = require("../../systems/antiAbuse/exploitDetector");
const { addGamblingStat } = require("../../systems/gambling/jackpotManager");
const { MIN_BET, MAX_BET, COOLDOWNS, MULTIPLIERS } = require("../../config/gambling");
const { notEnoughMoney, rateLimited } = require("../../utils/errors");
const { sendLog } = require("../../utils/logger");
const { applyGamblingMultiplier,} = require("../../systems/gambling/gamblingMultiplier");

function roll() {
  return Math.floor(Math.random() * 6) + 1;
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
    .setName("dice")
    .setDescription("Roll dice against the bot")
    .addIntegerOption(option =>
      option
        .setName("bet")
        .setDescription("Amount to bet")
        .setRequired(true)
        .setMinValue(MIN_BET)
        .setMaxValue(MAX_BET)
    ),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    if (!checkRate(interaction.user.id, "dice")) {
      await flag(interaction.user.id, interaction.guild.id, "Rate limit hit on dice");

      return interaction.editReply({
        embeds: [rateLimited()],
      });
    }

    const bet = interaction.options.getInteger("bet");
    const user = await economy.getUser(interaction.user.id, interaction.guild.id);

    const last = user.cooldowns.dice ? user.cooldowns.dice.getTime() : 0;
    const now = Date.now();
    const remaining = COOLDOWNS.dice - (now - last);

    if (remaining > 0) {
      const endTime = last + COOLDOWNS.dice;

      const makeCooldownEmbed = () => {
        const timeLeft = Math.max(endTime - Date.now(), 0);

        return new EmbedBuilder()
          .setColor("#fee75c")
          .setTitle("⏳ Dice Cooldown")
          .setDescription(
            `You already rolled recently.\n\n` +
            `Try again in **${formatTime(timeLeft)}**.`
          )
          .setFooter({
            text: `Requested by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
          })
          .setTimestamp();
      };

      const cooldownMsg = await interaction.editReply({
        embeds: [makeCooldownEmbed()],
        fetchReply: true,
      });

      const interval = setInterval(async () => {
        const timeLeft = endTime - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);

          return cooldownMsg
            .edit({
              embeds: [
                new EmbedBuilder()
                  .setColor("#57f287")
                  .setTitle("✅ Dice Ready")
                  .setDescription("You can use `/dice` again now.")
                  .setTimestamp(),
              ],
            })
            .catch(() => {});
        }

        await cooldownMsg
          .edit({
            embeds: [makeCooldownEmbed()],
          })
          .catch(() => {
            clearInterval(interval);
          });
      }, 5000);

      return;
    }

    if (!checkBet(user, bet)) {
      await flag(interaction.user.id, interaction.guild.id, `Invalid dice bet: ${bet}`);

      return interaction.editReply({
        embeds: [notEnoughMoney(bet, user)],
      });
    }

    // SAME GAMEPLAY / SAME ODDS
    const playerRoll = roll();

let botRoll;

// 40% player win chance
if (Math.random() < 0.4) {
  // player wins
  botRoll = Math.max(1, playerRoll - 1);

  // small randomization
  if (Math.random() < 0.3) {
    botRoll = Math.floor(Math.random() * playerRoll) + 1;
  }
} else {
  // bot wins
  botRoll = Math.min(6, playerRoll + 1);

  // small randomization
  if (Math.random() < 0.3) {
    botRoll = Math.floor(Math.random() * (7 - playerRoll)) + playerRoll;
  }
}
    user.wallet -= bet;
    user.cooldowns.dice = new Date();

    let payout = 0;
    let outcome = "loss";
    let resultText = `You lost **${bet.toLocaleString()} coins**.`;
    let color = "#ed4245";

    if (playerRoll > botRoll) {
    const basePayout = Math.floor(bet * MULTIPLIERS.dice);

const {
  multiplier,
  finalPayout,
  bonus,
} = applyGamblingMultiplier(user, basePayout);

payout = finalPayout;
      user.wallet += payout;
      outcome = "win";
      resultText = `You won **${payout.toLocaleString()} coins**!`;
      color = "#57f287";
      user.wins = (user.wins || 0) + 1;
    } else if (playerRoll === botRoll) {
      payout = bet;
      user.wallet += bet;
      outcome = "tie";
      resultText = "Tie! Your bet was refunded.";
      color = "#fee75c";
    } else {
      user.losses = (user.losses || 0) + 1;
    }

    user.bets = (user.bets || 0) + 1;
    await user.save();
    await addGamblingStat(interaction.guild.id, outcome, bet, payout);

    await sendLog(interaction, {
      title: "🎲 Dice",
      color: outcome === "win" ? "#57f287" : outcome === "tie" ? "#fee75c" : "#ed4245",
      fields: [
        { name: "Bet", value: `${bet.toLocaleString()} coins`, inline: true },
        { name: "Player Roll", value: `${playerRoll}`, inline: true },
        { name: "Bot Roll", value: `${botRoll}`, inline: true },
        { name: "Outcome", value: outcome.toUpperCase(), inline: true },
        { name: "Payout", value: `${payout.toLocaleString()} coins`, inline: true },
      ],
    });

    const profit = payout - bet;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle("🎲 Dice")
      .setDescription(resultText)
.addFields(
  {
    name: "🎲 Your Roll",
    value: `**${playerRoll}**`,
    inline: true,
  },
  {
    name: "🤖 Bot Roll",
    value: `**${botRoll}**`,
    inline: true,
  },
  {
    name: "📊 Outcome",
    value: `**${outcome.toUpperCase()}**`,
    inline: true,
  },
  {
    name: "💰 Bet",
    value: `**${bet.toLocaleString()}** coins`,
    inline: true,
  },
  {
    name: "🎁 Payout",
    value: `**${payout.toLocaleString()}** coins`,
    inline: true,
  },
  {
    name: outcome === "win" ? "📈 Profit" : outcome === "tie" ? "↩️ Refunded" : "📉 Lost",
    value:
      outcome === "win"
        ? `**${profit.toLocaleString()}** coins`
        : outcome === "tie"
          ? `**${bet.toLocaleString()}** coins`
          : `**${bet.toLocaleString()}** coins`,
    inline: true,
  },

  ...(outcome === "win" && gamblingMultiplier > 1
    ? [
        {
          name: "⚡ Gambling Boost",
          value: `**${gamblingMultiplier}x**`,
          inline: true,
        },
        {
          name: "🎁 Boost Bonus",
          value: `**${bonus.toLocaleString()}** coins`,
          inline: true,
        },
      ]
    : []),

  {
    name: "💸 Wallet",
    value: `**${user.wallet.toLocaleString()}** coins`,
    inline: true,
  }
)
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};