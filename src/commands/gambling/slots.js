const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../../systems/economy/economyManager");
const { spinSlots } = require("../../systems/gambling/slotsEngine");
const { LOG_CHANNEL_ID } = require("../../config/config");
const { checkRate } = require("../../systems/antiAbuse/rateLimiter");
const { checkBet } = require("../../systems/antiAbuse/fraudCheck");
const { flag } = require("../../systems/antiAbuse/exploitDetector");
const { notEnoughMoney, rateLimited } = require("../../utils/errors");
const { sendLog } = require("../../utils/logger");
const { applyGamblingMultiplier,} = require("../../systems/gambling/gamblingMultiplier");
const {addToJackpot,getJackpot,resetJackpot,addGamblingStat,} = require("../../systems/gambling/jackpotManager");
const { awardAchievements, ACHIEVEMENTS } = require("../../systems/economy/achievementManager");
const { MIN_BET, MAX_BET, COOLDOWNS, JACKPOT } = require("../../config/gambling");

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

function createEmbed(title, description, color = "#2b2d31") {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

async function sendGamblingLog(interaction, message) {
  const channel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!channel) return;
  await channel.send(message).catch(() => {});
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("slots")
    .setDescription("Play animated slots")
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

    if (!checkRate(interaction.user.id, "slots")) {
      await flag(interaction.user.id, interaction.guild.id, "Rate limit hit on slots");

      return interaction.editReply({
        embeds: [rateLimited()],
      });
    }

    const bet = interaction.options.getInteger("bet");
    const user = await economy.getUser(interaction.user.id, interaction.guild.id);

    const lastSlots = user.cooldowns.slots ? user.cooldowns.slots.getTime() : 0;
    const now = Date.now();
    const remaining = COOLDOWNS.slots - (now - lastSlots);

    if (remaining > 0) {
      const endTime = lastSlots + COOLDOWNS.slots;

      const makeCooldownEmbed = () => {
        const timeLeft = Math.max(endTime - Date.now(), 0);

        return new EmbedBuilder()
          .setColor("#fee75c")
          .setTitle("⏳ Slots Cooldown")
          .setDescription(
            `You already played slots recently.\n\n` +
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
                  .setTitle("✅ Slots Ready")
                  .setDescription("You can use `/slots` again now.")
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
      await flag(interaction.user.id, interaction.guild.id, `Invalid slots bet: ${bet}`);

      return interaction.editReply({
        embeds: [notEnoughMoney(bet, user)],
      });
    }

    user.wallet -= bet;
    user.cooldowns.slots = new Date();
    await user.save();

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor("#5865f2")
          .setTitle("🎰 Slots")
          .setDescription("Spinning...")
          .addFields(
            {
              name: "🎰 Reels",
              value: "[ ❔ | ❔ | ❔ ]",
              inline: false,
            },
            {
              name: "💰 Bet",
              value: `**${bet.toLocaleString()}** coins`,
              inline: true,
            },
            {
              name: "💸 Wallet",
              value: `**${user.wallet.toLocaleString()}** coins`,
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

    const fakeSpins = [
      ["🍒", "❔", "❔"],
      ["🍒", "💎", "❔"],
      ["⭐", "🍋", "7️⃣"],
    ];

    for (const spin of fakeSpins) {
      await sleep(700);

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("#5865f2")
            .setTitle("🎰 Slots")
            .setDescription("Spinning...")
            .addFields(
              {
                name: "🎰 Reels",
                value: `[ ${spin.join(" | ")} ]`,
                inline: false,
              },
              {
                name: "💰 Bet",
                value: `**${bet.toLocaleString()}** coins`,
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

    await sleep(700);

    // SAME GAMEPLAY / SAME RESULT ENGINE
    const result = spinSlots();
   const basePayout = Math.floor(bet * result.multiplier);

    const jackpotHit = Math.random() < JACKPOT.chance;
    const jackpotAmount = await getJackpot(interaction.guild.id);

    const freshUser = await economy.getUser(interaction.user.id, interaction.guild.id);
   const {multiplier: gamblingMultiplier,finalPayout: payout,bonus,} = applyGamblingMultiplier(freshUser, basePayout);
    await sendLog(interaction, {
      title: "🎰 Slots",
      color: result.win ? "#57f287" : "#ed4245",
      fields: [
        { name: "Bet", value: `${bet.toLocaleString()} coins`, inline: true },
        { name: "Result", value: result.win ? "WIN" : "LOSS", inline: true },
        { name: "Payout", value: `${payout.toLocaleString()} coins`, inline: true },
        { name: "Reels", value: result.reels.join(" | "), inline: false },
        { name: "Jackpot Hit", value: jackpotHit ? "YES" : "NO", inline: true },
      ],
    });

    if (!result.win) {
      const contribution = Math.floor(bet * JACKPOT.lossContribution);
      const newJackpot = await addToJackpot(interaction.guild.id, contribution);

      freshUser.bets = (freshUser.bets || 0) + 1;
      freshUser.losses = (freshUser.losses || 0) + 1;
      await addGamblingStat(interaction.guild.id, "loss", bet, 0);
      await freshUser.save();

      const embed = new EmbedBuilder()
        .setColor("#ed4245")
        .setTitle("🎰 Slots — You Lost")
        .setDescription(`The reels stopped at:\n\n**[ ${result.reels.join(" | ")} ]**`)
        .addFields(
          {
            name: "📉 Lost",
            value: `**${bet.toLocaleString()}** coins`,
            inline: true,
          },
          {
            name: "💎 Added To Jackpot",
            value: `**${contribution.toLocaleString()}** coins`,
            inline: true,
          },
          {
            name: "💎 Current Jackpot",
            value: `**${newJackpot.toLocaleString()}** coins`,
            inline: true,
          },
          {
            name: "💸 Wallet",
            value: `**${freshUser.wallet.toLocaleString()}** coins`,
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
    }

    let totalWin = payout;

    if (jackpotHit && jackpotAmount > 0) {
      const paidJackpot = await resetJackpot(interaction.guild.id);
      totalWin += paidJackpot;

      freshUser.wallet += totalWin;
      freshUser.bets = (freshUser.bets || 0) + 1;
      freshUser.wins = (freshUser.wins || 0) + 1;
      const unlocked = awardAchievements(freshUser, ['jackpot_winner']);
      await freshUser.save();

      await addGamblingStat(interaction.guild.id, "win", bet, totalWin);

      const winMessage =
        `💎 **JACKPOT WINNER** 💎\n` +
        `<@${interaction.user.id}> just hit the **1 in 1,000,000 jackpot**!\n\n` +
        `Jackpot Won: **${paidJackpot.toLocaleString()} coins**\n` +
        `Total Win: **${totalWin.toLocaleString()} coins**`;

      await sendGamblingLog(interaction, winMessage);
      interaction.channel.send(winMessage).catch(() => {});

      const embed = new EmbedBuilder()
        .setColor("#ffd700")
        .setTitle("💎 JACKPOT WINNER 💎")
        .setDescription(`The reels stopped at:\n\n**[ ${result.reels.join(" | ")} ]**`)
        .addFields(
          {
            name: "💰 Bet",
            value: `**${bet.toLocaleString()}** coins`,
            inline: true,
          },
          {
            name: "🎁 Slot Payout",
            value: `**${payout.toLocaleString()}** coins`,
            inline: true,
          },
          {
            name: "💎 Jackpot Won",
            value: `**${paidJackpot.toLocaleString()}** coins`,
            inline: true,
          },
          {
            name: "💰 Total Win",
            value: `**${totalWin.toLocaleString()}** coins`,
            inline: true,
          },
          {
            name: "📈 Profit",
            value: `**${(totalWin - bet).toLocaleString()}** coins`,
            inline: true,
          },
          {
            name: "💸 Wallet",
            value: `**${freshUser.wallet.toLocaleString()}** coins`,
            inline: true,
          }
        )
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp();

      if (unlocked?.length) {
        embed.addFields({
          name: '🏅 Achievement Unlocked',
          value: unlocked
            .map(id => {
              const achievement = ACHIEVEMENTS[id];
              return achievement ? `${achievement.emoji} ${achievement.name}` : `🏅 ${id}`;
            })
            .join('\n'),
          inline: false,
        });
      }

      return interaction.editReply({ embeds: [embed] });
    }

    freshUser.wallet += payout;
    freshUser.bets = (freshUser.bets || 0) + 1;
    freshUser.wins = (freshUser.wins || 0) + 1;
    await freshUser.save();

    await addGamblingStat(interaction.guild.id, "win", bet, payout);

    const embed = new EmbedBuilder()
      .setColor("#57f287")
      .setTitle("🎰 Slots — You Won!")
      .setDescription(`The reels stopped at:\n\n**[ ${result.reels.join(" | ")} ]**`)
.addFields(
  {
    name: "💰 Bet",
    value: `**${bet.toLocaleString()}** coins`,
    inline: true,
  },
  {
    name: "🎁 Won",
    value: `**${payout.toLocaleString()}** coins`,
    inline: true,
  },
  {
    name: "📈 Profit",
    value: `**${(payout - bet).toLocaleString()}** coins`,
    inline: true,
  },

  ...(gamblingMultiplier > 1
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
    name: "💎 Jackpot",
    value: `**${jackpotAmount.toLocaleString()}** coins`,
    inline: true,
  },
  {
    name: "💸 Wallet",
    value: `**${freshUser.wallet.toLocaleString()}** coins`,
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