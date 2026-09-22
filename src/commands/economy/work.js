const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../../systems/economy/economyManager");
const { addXp } = require("../../systems/economy/levelManager");
const { awardAchievements, ACHIEVEMENTS } = require("../../systems/economy/achievementManager");
const { checkRate } = require("../../systems/antiAbuse/rateLimiter");
const { flag } = require("../../systems/antiAbuse/exploitDetector");

const WORK_COOLDOWN = 5 * 60 * 1000;
const MIN_PAY = 200;
const MAX_PAY = 500;
const XP_GAIN = 25;

function randomPay() {
  return Math.floor(Math.random() * (MAX_PAY - MIN_PAY + 1)) + MIN_PAY;
}

function getWealth(user) {
  return (user.wallet || 0) + (user.bank || 0);
}

function getScaledWorkPay(user, baseAmount) {
  const wealth = getWealth(user);

  let bonusPercent = 0;

  if (wealth >= 1_000_000) bonusPercent = 0.10;
  if (wealth >= 10_000_000) bonusPercent = 0.20;
  if (wealth >= 100_000_000) bonusPercent = 0.35;
  if (wealth >= 1_000_000_000) bonusPercent = 0.50;

  return Math.floor(baseAmount * (1 + bonusPercent));
}

function getActiveWorkMultiplier(user) {
  const boost = user.boosts?.workMultiplier;

  if (!boost || !boost.expiresAt) return 1;
  if (new Date(boost.expiresAt).getTime() < Date.now()) return 1;

  return boost.multiplier || 1;
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
    .setName("work")
    .setDescription("Work to earn money"),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    if (!checkRate(interaction.user.id, "work", 3, 5000)) {
      await flag(interaction.user.id, interaction.guild.id, "Rate limit hit on work");

      return interaction.editReply({
        embeds: [
          errorEmbed(
            "⚠️ Slow Down",
            "You are using `/work` too fast. Chill for a second."
          ),
        ],
      });
    }

    const userData = await economy.getUser(
      interaction.user.id,
      interaction.guild.id
    );

    const now = Date.now();
    const lastWorked = userData.cooldowns.work
      ? userData.cooldowns.work.getTime()
      : 0;

    const remaining = WORK_COOLDOWN - (now - lastWorked);

    if (remaining > 0) {
      const endTime = lastWorked + WORK_COOLDOWN;

     const makeCooldownEmbed = () => {
  const timeLeft = Math.max(endTime - Date.now(), 0);

  return new EmbedBuilder()
    .setColor("#fee75c")
    .setTitle("💼 Work Cooldown")
    .setDescription(
      `You're still recovering from your last shift.\n\n` +
      `⏰ Time Remaining: **${formatTime(timeLeft)}**`
    )
    .setAuthor({
      name: interaction.user.tag,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
    })
    .addFields({
      name: "Try Again",
      value: "Come back when your energy has recovered.",
      inline: false,
    })
    .setFooter({
      text: "Work smarter, not harder",
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
          .setTitle("💼 Work Ready")
          .setDescription("You're fully rested and ready for another shift.")
          .setAuthor({
            name: interaction.user.tag,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
          })
          .addFields({
            name: "Ready",
            value: "You can use `/work` again now.",
            inline: false,
          })
          .setFooter({
            text: "Time to make some money",
          })
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

    const baseAmount = randomPay();
    const scaledBase = getScaledWorkPay(userData, baseAmount);
    const wealthBonus = scaledBase - baseAmount;

    const multiplier = getActiveWorkMultiplier(userData);
    const amount = Math.floor(scaledBase * multiplier);
    const multiplierBonus = amount - scaledBase;

    userData.wallet += amount;
    userData.lifetimeEarned = (userData.lifetimeEarned || 0) + amount;
    userData.workEarned = (userData.workEarned || 0) + amount;

    const xpResult = addXp(userData, XP_GAIN);
    const unlocked = awardAchievements(userData, ['work_earned_10000', 'work_earned_50000']);

    userData.cooldowns.work = new Date();
    await userData.save();

    const embed = new EmbedBuilder()
      .setColor("#57f287")
      .setTitle("💼 Work Complete")
      .setDescription(
        `You worked hard and earned **${amount.toLocaleString()} coins**.`
      )
      .addFields(
        {
          name: "💰 Base Pay",
          value: `**${baseAmount.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "📈 Wealth Bonus",
          value: `**${wealthBonus.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "⚡ Multiplier",
          value: `**${multiplier}x**`,
          inline: true,
        },
        {
          name: "🎁 Multiplier Bonus",
          value: `**${multiplierBonus.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "💵 Total Earned",
          value: `**${amount.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "⭐ XP Gained",
          value: `**${XP_GAIN} XP**`,
          inline: true,
        },
        {
          name: "💸 Wallet",
          value: `**${userData.wallet.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "🏦 Bank",
          value: `**${userData.bank.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "📊 Net Worth",
          value: `**${getWealth(userData).toLocaleString()}** coins`,
          inline: true,
        }
      )
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    if (xpResult.leveledUp) {
      embed.addFields({
        name: "🎉 Level Up",
        value: `You are now level **${userData.level}**!`,
        inline: false,
      });
    }

    if (unlocked?.length) {
      embed.addFields({
        name: "🏅 Achievement Unlocked",
        value: unlocked
          .map(id => {
            const achievement = ACHIEVEMENTS[id];
            return achievement ? `${achievement.emoji} ${achievement.name}` : `🏅 ${id}`;
          })
          .join("\n"),
        inline: false,
      });
    }

    return interaction.editReply({ embeds: [embed] });
  },
};