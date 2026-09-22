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

function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Bet on heads or tails")
    .addStringOption(option =>
      option
        .setName("choice")
        .setDescription("Heads or tails")
        .setRequired(true)
        .addChoices(
          { name: "Heads", value: "heads" },
          { name: "Tails", value: "tails" }
        )
    )
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

    if (!checkRate(interaction.user.id, "coinflip")) {
      await flag(interaction.user.id, interaction.guild.id, "Rate limit hit on coinflip");

      return interaction.editReply({
        embeds: [rateLimited()],
      });
    }

    const choice = interaction.options.getString("choice");
    const bet = interaction.options.getInteger("bet");
    const user = await economy.getUser(interaction.user.id, interaction.guild.id);

    const last = user.cooldowns.coinflip ? user.cooldowns.coinflip.getTime() : 0;
    const now = Date.now();
    const remaining = COOLDOWNS.coinflip - (now - last);

    if (remaining > 0) {
      const endTime = last + COOLDOWNS.coinflip;

      const makeCooldownEmbed = () => {
        const timeLeft = Math.max(endTime - Date.now(), 0);

        return new EmbedBuilder()
          .setColor("#fee75c")
          .setTitle("⏳ Coinflip Cooldown")
          .setDescription(
            `You already flipped recently.\n\n` +
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
                  .setTitle("✅ Coinflip Ready")
                  .setDescription("You can use `/coinflip` again now.")
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
      await flag(
        interaction.user.id,
        interaction.guild.id,
        `Invalid coinflip bet: ${bet}`
      );

      return interaction.editReply({
        embeds: [notEnoughMoney(bet, user)],
      });
    }

    // SAME GAMEPLAY / SAME WIN CHANCE
    const result = Math.random() < 0.5 ? "heads" : "tails";
    const won = result === choice;
    let payout = 0;
let multiplier = 1;
let bonus = 0;

if (won) {
  const basePayout = Math.floor(bet * MULTIPLIERS.coinflip);

  ({
    multiplier,
    finalPayout: payout,
    bonus,
  } = applyGamblingMultiplier(user, basePayout));
}

    user.wallet -= bet;
    user.cooldowns.coinflip = new Date();
    user.bets = (user.bets || 0) + 1;

    if (won) {
      user.wallet += payout;
      user.wins = (user.wins || 0) + 1;
    } else {
      user.losses = (user.losses || 0) + 1;
    }

    await user.save();
    await addGamblingStat(interaction.guild.id, won ? "win" : "loss", bet, payout);

    await sendLog(interaction, {
      title: "🪙 Coinflip",
      color: won ? "#57f287" : "#ed4245",
      fields: [
        { name: "Choice", value: choice, inline: true },
        { name: "Result", value: result, inline: true },
        { name: "Bet", value: `${bet.toLocaleString()} coins`, inline: true },
        { name: "Outcome", value: won ? "WIN" : "LOSS", inline: true },
        { name: "Payout", value: `${payout.toLocaleString()} coins`, inline: true },
      ],
    });

    const embed = new EmbedBuilder()
      .setColor(won ? "#57f287" : "#ed4245")
      .setTitle("🪙 Coinflip")
      .setDescription(
        won
          ? `The coin landed on **${result}** and you won **${payout.toLocaleString()} coins**!`
          : `The coin landed on **${result}** and you lost **${bet.toLocaleString()} coins**.`
      )
     .addFields(
  {
    name: "🧠 Your Pick",
    value: `**${choice}**`,
    inline: true,
  },
  {
    name: "🪙 Result",
    value: `**${result}**`,
    inline: true,
  },
  {
    name: "📊 Outcome",
    value: won ? "**WIN**" : "**LOSS**",
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