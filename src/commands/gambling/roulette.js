const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const crypto = require("crypto");

const economy = require("../../systems/economy/economyManager");
const { checkRate } = require("../../systems/antiAbuse/rateLimiter");
const { checkBet } = require("../../systems/antiAbuse/fraudCheck");
const { flag } = require("../../systems/antiAbuse/exploitDetector");
const { addGamblingStat } = require("../../systems/gambling/jackpotManager");
const { MIN_BET, COOLDOWNS, MULTIPLIERS } = require("../../config/gambling");
const { notEnoughMoney, rateLimited } = require("../../utils/errors");
const { sendLog } = require("../../utils/logger");
const { applyGamblingMultiplier,} = require("../../systems/gambling/gamblingMultiplier");

const ROULETTE_MAX_BET = 50000;

const RED_NUMBERS = [
  1, 3, 5, 7, 9, 12, 14, 16, 18,
  19, 21, 23, 25, 27, 30, 32, 34, 36,
];

const recentSpins = new Map();

function rawSpinWheel() {
  return crypto.randomInt(0, 37);
}

function getColor(number) {
  if (number === 0) return "green";
  if (RED_NUMBERS.includes(number)) return "red";
  return "black";
}

function getEmoji(color) {
  if (color === "red") return "🔴";
  if (color === "black") return "⚫";
  return "🟢";
}

function isAlternatingPattern(colors) {
  if (colors.length < 4) return false;

  const lastFour = colors.slice(-4);

  if (lastFour.includes("green")) return false;

  return (
    lastFour[0] !== lastFour[1] &&
    lastFour[1] !== lastFour[2] &&
    lastFour[2] !== lastFour[3]
  );
}

function spinWheel(guildId) {
  let recent = recentSpins.get(guildId) || [];

  let rolledNumber = rawSpinWheel();
  let rolledColor = getColor(rolledNumber);

  for (let i = 0; i < 6; i++) {
    const testColors = [...recent, rolledColor];

    if (!isAlternatingPattern(testColors)) break;

    rolledNumber = rawSpinWheel();
    rolledColor = getColor(rolledNumber);
  }

  recent.push(rolledColor);

  if (recent.length > 8) {
    recent = recent.slice(-8);
  }

  recentSpins.set(guildId, recent);

  return rolledNumber;
}

function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function errorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor("#ed4245")
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roulette")
    .setDescription("Play balanced roulette")
    .addStringOption(option =>
      option
        .setName("bettype")
        .setDescription("What do you want to bet on?")
        .setRequired(true)
        .addChoices(
          { name: "Red", value: "red" },
          { name: "Black", value: "black" },
          { name: "Green / 0", value: "green" },
          { name: "Exact Number", value: "number" },
          { name: "Odd", value: "odd" },
          { name: "Even", value: "even" }
        )
    )
    .addIntegerOption(option =>
      option
        .setName("bet")
        .setDescription("Amount to bet")
        .setRequired(true)
        .setMinValue(MIN_BET)
        .setMaxValue(ROULETTE_MAX_BET)
    )
    .addIntegerOption(option =>
      option
        .setName("number")
        .setDescription("Exact number to bet on, 0-36")
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(36)
    ),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    if (!checkRate(interaction.user.id, "roulette")) {
      await flag(interaction.user.id, interaction.guild.id, "Rate limit hit on roulette");

      return interaction.editReply({
        embeds: [rateLimited()],
      });
    }

    const betType = interaction.options.getString("bettype");
    const bet = interaction.options.getInteger("bet");
    const chosenNumber = interaction.options.getInteger("number");
    const user = await economy.getUser(interaction.user.id, interaction.guild.id);

    const last = user.cooldowns.roulette ? user.cooldowns.roulette.getTime() : 0;
    const now = Date.now();
    const remaining = COOLDOWNS.roulette - (now - last);

    if (remaining > 0) {
      const endTime = last + COOLDOWNS.roulette;

      const makeCooldownEmbed = () => {
        const timeLeft = Math.max(endTime - Date.now(), 0);

        return new EmbedBuilder()
          .setColor("#fee75c")
          .setTitle("⏳ Roulette Cooldown")
          .setDescription(
            `You already played roulette recently.\n\n` +
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
                  .setTitle("✅ Roulette Ready")
                  .setDescription("You can use `/roulette` again now.")
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

    if (betType === "number" && chosenNumber === null) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            "❌ Missing Number",
            "Choose a number between **0 and 36** when using **Exact Number** bets."
          ),
        ],
      });
    }

    if (betType !== "number" && chosenNumber !== null) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            "❌ Invalid Number Option",
            "Only use the `number` option with **Exact Number** bets."
          ),
        ],
      });
    }

    if (!checkBet(user, bet, ROULETTE_MAX_BET)) {
      await flag(interaction.user.id, interaction.guild.id, `Invalid roulette bet: ${bet}`);

      return interaction.editReply({
        embeds: [notEnoughMoney(bet, user)],
      });
    }

    user.wallet -= bet;
    user.cooldowns.roulette = new Date();

    const rolledNumber = spinWheel(interaction.guild.id);
    const rolledColor = getColor(rolledNumber);
    const emoji = getEmoji(rolledColor);

    let won = false;
    let multiplier = 0;
    let betLabel = betType;

    if (betType === "red" || betType === "black") {
      won = rolledColor === betType;
      multiplier = MULTIPLIERS.rouletteColor;
    }

    if (betType === "green") {
      won = rolledNumber === 0;
      multiplier = MULTIPLIERS.rouletteGreen;
    }

    if (betType === "number") {
      won = rolledNumber === chosenNumber;
      multiplier = MULTIPLIERS.rouletteNumber;
      betLabel = `number ${chosenNumber}`;
    }

    if (betType === "odd") {
      won = rolledNumber !== 0 && rolledNumber % 2 === 1;
      multiplier = MULTIPLIERS.rouletteOddEven;
    }

    if (betType === "even") {
      won = rolledNumber !== 0 && rolledNumber % 2 === 0;
      multiplier = MULTIPLIERS.rouletteOddEven;
    }

 let payout = 0;
let gamblingMultiplier = 1;
let bonus = 0;

if (won) {
  const basePayout = Math.floor(bet * multiplier);

  ({
    multiplier: gamblingMultiplier,
    finalPayout: payout,
    bonus,
  } = applyGamblingMultiplier(user, basePayout));
}

    if (won) {
      user.wallet += payout;
    }

    await user.save();

    await addGamblingStat(
      interaction.guild.id,
      won ? "win" : "loss",
      bet,
      payout
    );

    await sendLog(interaction, {
      title: "🎡 Roulette",
      color: won ? "#57f287" : "#ed4245",
      fields: [
        { name: "Bet", value: `${bet.toLocaleString()} coins`, inline: true },
        { name: "Type", value: `${betLabel}`, inline: true },
        { name: "Rolled", value: `${rolledNumber} ${emoji} ${rolledColor}`, inline: true },
        { name: "Outcome", value: won ? "WIN" : "LOSS", inline: true },
        { name: "Payout", value: `${payout.toLocaleString()} coins`, inline: true },
      ],
    });

    const profit = payout - bet;

    const embed = new EmbedBuilder()
      .setColor(won ? "#57f287" : "#ed4245")
      .setTitle("🎡 Roulette")
      .setDescription(
        won
          ? `The wheel landed on **${rolledNumber} ${emoji} ${rolledColor.toUpperCase()}** and you won **${payout.toLocaleString()} coins**!`
          : `The wheel landed on **${rolledNumber} ${emoji} ${rolledColor.toUpperCase()}** and you lost **${bet.toLocaleString()} coins**.`
      )
.addFields(
  {
    name: "🎯 Your Bet",
    value: `**${betLabel}**`,
    inline: true,
  },
  {
    name: "💰 Bet Amount",
    value: `**${bet.toLocaleString()}** coins`,
    inline: true,
  },
  {
    name: "🎡 Landed On",
    value: `**${rolledNumber} ${emoji} ${rolledColor.toUpperCase()}**`,
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
        text: "Roulette uses secure random rolls",
      })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};