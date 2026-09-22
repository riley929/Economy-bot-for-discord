const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../../systems/economy/economyManager");
const { checkRate } = require("../../systems/antiAbuse/rateLimiter");
const { checkBet } = require("../../systems/antiAbuse/fraudCheck");
const { flag } = require("../../systems/antiAbuse/exploitDetector");
const { MIN_BET, MAX_BET, COOLDOWNS } = require("../../config/gambling");
const { addGamblingStat } = require("../../systems/gambling/jackpotManager");
const { notEnoughMoney, rateLimited } = require("../../utils/errors");
const { sendLog } = require("../../utils/logger");
const { applyGamblingMultiplier,} = require("../../systems/gambling/gamblingMultiplier");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function generateCrashPoint() {
  const roll = Math.random();

  if (roll < 0.50) return +(1 + Math.random() * 0.8).toFixed(2);
  if (roll < 0.85) return +(1.8 + Math.random() * 1.7).toFixed(2);
  if (roll < 0.97) return +(3.5 + Math.random() * 4).toFixed(2);

  return +(7.5 + Math.random() * 12.5).toFixed(2);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("crash")
    .setDescription("Play crash by choosing a cashout multiplier")
    .addIntegerOption(option =>
      option
        .setName("bet")
        .setDescription("Amount to bet")
        .setRequired(true)
        .setMinValue(MIN_BET)
        .setMaxValue(MAX_BET)
    )
    .addNumberOption(option =>
      option
        .setName("cashout")
        .setDescription("Multiplier to cash out at, example 2.0")
        .setRequired(true)
        .setMinValue(1.1)
        .setMaxValue(10)
    ),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    if (!checkRate(interaction.user.id, "crash")) {
      await flag(interaction.user.id, interaction.guild.id, "Rate limit hit on crash");

      return interaction.editReply({
        embeds: [rateLimited()],
      });
    }

    const bet = interaction.options.getInteger("bet");
    const cashout = interaction.options.getNumber("cashout");
    const user = await economy.getUser(interaction.user.id, interaction.guild.id);

    const last = user.cooldowns.crash ? user.cooldowns.crash.getTime() : 0;
    const now = Date.now();
    const remaining = COOLDOWNS.crash - (now - last);

    if (remaining > 0) {
      const endTime = last + COOLDOWNS.crash;

      const makeCooldownEmbed = () => {
        const timeLeft = Math.max(endTime - Date.now(), 0);

        return new EmbedBuilder()
          .setColor("#fee75c")
          .setTitle("⏳ Crash Cooldown")
          .setDescription(
            `You already played crash recently.\n\n` +
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
                  .setTitle("✅ Crash Ready")
                  .setDescription("You can use `/crash` again now.")
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
      await flag(interaction.user.id, interaction.guild.id, `Invalid crash bet: ${bet}`);

      return interaction.editReply({
        embeds: [notEnoughMoney(bet, user)],
      });
    }

    user.wallet -= bet;
    user.cooldowns.crash = new Date();
    await user.save();

    const crashPoint = generateCrashPoint();

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor("#5865f2")
          .setTitle("📈 Crash")
          .setDescription("Starting round...")
          .addFields(
            {
              name: "💰 Bet",
              value: `**${bet.toLocaleString()}** coins`,
              inline: true,
            },
            {
              name: "🎯 Your Cashout",
              value: `**${cashout.toFixed(2)}x**`,
              inline: true,
            },
            {
              name: "📊 Status",
              value: "**Launching...**",
              inline: true,
            }
          )
          .setFooter({
            text: `Requested by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
          })
          .setTimestamp(),
      ],
    });

    const steps = [1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5, 7.5, 10];

    for (const step of steps) {
      if (step >= crashPoint) break;

      await sleep(500);

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("#5865f2")
            .setTitle("📈 Crash")
            .setDescription(`Current multiplier: **${step.toFixed(2)}x**`)
            .addFields(
              {
                name: "💰 Bet",
                value: `**${bet.toLocaleString()}** coins`,
                inline: true,
              },
              {
                name: "🎯 Your Cashout",
                value: `**${cashout.toFixed(2)}x**`,
                inline: true,
              },
              {
                name: "📊 Status",
                value: cashout <= step ? "**Cashing out target reached**" : "**Still climbing...**",
                inline: true,
              }
            )
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
            })
            .setTimestamp(),
        ],
      });
    }

    // SAME GAMEPLAY / SAME WIN CONDITION / SAME PAYOUT
    const won = cashout < crashPoint;
  let payout = 0;
let multiplier = 1;
let bonus = 0;

if (won) {
  const basePayout = Math.floor(bet * cashout * 0.92);

  ({
    multiplier,
    finalPayout: payout,
    bonus,
  } = applyGamblingMultiplier(user, basePayout));
}

    if (won) {
      user.wallet += payout;
    }

    await user.save();
    await addGamblingStat(interaction.guild.id, won ? "win" : "loss", bet, payout);

    await sendLog(interaction, {
      title: "📈 Crash",
      color: won ? "#57f287" : "#ed4245",
      fields: [
        { name: "Bet", value: `${bet.toLocaleString()} coins`, inline: true },
        { name: "Cashout", value: `${cashout.toFixed(2)}x`, inline: true },
        { name: "Crash Point", value: `${crashPoint.toFixed(2)}x`, inline: true },
        { name: "Outcome", value: won ? "WIN" : "LOSS", inline: true },
        { name: "Payout", value: `${payout.toLocaleString()} coins`, inline: true },
      ],
    });

    const profit = payout - bet;

    const embed = new EmbedBuilder()
      .setColor(won ? "#57f287" : "#ed4245")
      .setTitle(won ? "📈 Crash — Cashed Out!" : "💥 Crash — Busted!")
      .setDescription(
        won
          ? `You cashed out before the crash and won **${payout.toLocaleString()} coins**!`
          : `The game crashed before your cashout. You lost **${bet.toLocaleString()} coins**.`
      )
.addFields(
  {
    name: "💰 Bet",
    value: `**${bet.toLocaleString()}** coins`,
    inline: true,
  },
  {
    name: "🎯 Your Cashout",
    value: `**${cashout.toFixed(2)}x**`,
    inline: true,
  },
  {
    name: "💥 Crash Point",
    value: `**${crashPoint.toFixed(2)}x**`,
    inline: true,
  },
  {
    name: "📊 Outcome",
    value: won ? "**WIN**" : "**LOSS**",
    inline: true,
  },
  {
    name: "🎁 Payout",
    value: `**${payout.toLocaleString()}** coins`,
    inline: true,
  },
  {
    name: won ? "📈 Profit" : "📉 Lost",
    value: won
      ? `**${profit.toLocaleString()}** coins`
      : `**${bet.toLocaleString()}** coins`,
    inline: true,
  },

...(won && gamblingMultiplier > 1
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