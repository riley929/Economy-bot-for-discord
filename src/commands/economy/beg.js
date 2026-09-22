const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../../systems/economy/economyManager");
const { checkRate } = require("../../systems/antiAbuse/rateLimiter");
const { flag } = require("../../systems/antiAbuse/exploitDetector");

const COOLDOWN = 5 * 60 * 1000;
const MIN_REWARD = 25;
const MAX_REWARD = 250;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getWealth(user) {
  return (user.wallet || 0) + (user.bank || 0);
}

function getScaledBegReward(user, baseAmount) {
  const wealth = getWealth(user);

  let bonusPercent = 0;

  if (wealth >= 1_000_000) bonusPercent = 0.05;
  if (wealth >= 10_000_000) bonusPercent = 0.10;
  if (wealth >= 100_000_000) bonusPercent = 0.15;
  if (wealth >= 1_000_000_000) bonusPercent = 0.20;

  return Math.floor(baseAmount * (1 + bonusPercent));
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
    .setName("beg")
    .setDescription("Beg for a small amount of coins"),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    // Counts EVERY attempt, even cooldown attempts
    if (!checkRate(interaction.user.id, "beg", 6, 10000)) {
      await flag(interaction.user.id, interaction.guild.id, "Rate limit hit on beg");

      return interaction.editReply({
        embeds: [
          errorEmbed(
            "⚠️ Slow Down",
            "You are using `/beg` too fast. Chill for a second."
          ),
        ],
      });
    }

    const user = await economy.getUser(interaction.user.id, interaction.guild.id);

    const last = user.cooldowns.beg ? user.cooldowns.beg.getTime() : 0;
    const now = Date.now();
    const remaining = COOLDOWN - (now - last);

    if (remaining > 0) {
      const endTime = last + COOLDOWN;

      const makeCooldownEmbed = () => {
  const timeLeft = Math.max(endTime - Date.now(), 0);

  return new EmbedBuilder()
    .setColor("#fee75c")
    .setTitle("🤲 Beg Cooldown")
    .setDescription(
      `People are tired of your requests right now.\n\n` +
      `⏰ Time Remaining: **${formatTime(timeLeft)}**`
    )
    .setAuthor({
      name: interaction.user.tag,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
    })
    .addFields({
      name: "Try Again",
      value: "Maybe someone will be more generous later.",
      inline: false,
    })
    .setFooter({
      text: "Every coin counts",
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
          .setTitle("🤲 Beg Ready")
          .setDescription("People seem willing to listen to your requests again.")
          .setAuthor({
            name: interaction.user.tag,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
          })
          .addFields({
            name: "Ready",
            value: "You can use `/beg` again now.",
            inline: false,
          })
          .setFooter({
            text: "Maybe someone will spare a coin",
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

    user.cooldowns.beg = new Date();

    const foundMoney = Math.random() < 0.7;

    if (!foundMoney) {
      await user.save();

      const failEmbed = new EmbedBuilder()
        .setColor("#fee75c")
        .setTitle("🥲 Begging Failed")
        .setDescription("Nobody gave you anything this time.")
        .addFields(
          {
            name: "💸 Wallet",
            value: `**${user.wallet.toLocaleString()}** coins`,
            inline: true,
          },
          {
            name: "🏦 Bank",
            value: `**${user.bank.toLocaleString()}** coins`,
            inline: true,
          },
          {
            name: "⏰ Cooldown",
            value: "**5 minutes**",
            inline: true,
          }
        )
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp();

      return interaction.editReply({ embeds: [failEmbed] });
    }

    const baseReward = randomInt(MIN_REWARD, MAX_REWARD);
    const reward = getScaledBegReward(user, baseReward);
    const bonus = reward - baseReward;

    user.wallet += reward;
    await user.save();

    const embed = new EmbedBuilder()
      .setColor("#57f287")
      .setTitle("🤲 Begging Worked")
      .setDescription(
        `Someone felt bad for you and gave you **${reward.toLocaleString()} coins**.`
      )
      .addFields(
        {
          name: "💰 Base Reward",
          value: `**${baseReward.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "📈 Wealth Bonus",
          value: `**${bonus.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "🎁 Total Received",
          value: `**${reward.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "💸 Wallet",
          value: `**${user.wallet.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "🏦 Bank",
          value: `**${user.bank.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "📊 Net Worth",
          value: `**${getWealth(user).toLocaleString()}** coins`,
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