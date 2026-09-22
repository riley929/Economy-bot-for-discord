const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../../systems/economy/economyManager");
const { awardAchievements, ACHIEVEMENTS } = require("../../systems/economy/achievementManager");

const COOLDOWN = 24 * 60 * 60 * 1000;
const BASE = 1000;
const STREAK_BONUS = 150;
const MAX_STREAK_BONUS = 5000;

function errorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor("#ed4245")
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim your daily reward"),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    const user = await economy.getUser(interaction.user.id, interaction.guild.id);

    const last = user.cooldowns.daily ? user.cooldowns.daily.getTime() : 0;
    const now = Date.now();
    const diff = now - last;

    if (diff < COOLDOWN) {
  const endTime = last + COOLDOWN;

 const makeCooldownEmbed = () => {
  const remaining = Math.max(endTime - Date.now(), 0);

  return new EmbedBuilder()
    .setColor("#fee75c")
    .setTitle("🎁 Daily Cooldown")
    .setDescription(
      `You've already claimed today's reward.\n\n` +
      `⏰ Time Remaining: **${formatTime(remaining)}**`
    )
    .setAuthor({
      name: interaction.user.tag,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
    })
    .addFields({
      name: "Try Again",
      value: "Come back tomorrow for another reward.",
      inline: false,
    })
    .setFooter({
      text: "Consistency pays off",
    })
    .setTimestamp();
};

  const cooldownMsg = await interaction.editReply({
    embeds: [makeCooldownEmbed()],
    fetchReply: true,
  });

  const interval = setInterval(async () => {
    const remaining = endTime - Date.now();

    if (remaining <= 0) {
      clearInterval(interval);

      return cooldownMsg.edit({
        embeds: [
new EmbedBuilder()
  .setColor("#57f287")
  .setTitle("🎁 Daily Ready")
  .setDescription("Your daily reward is available again.")
  .setAuthor({
    name: interaction.user.tag,
    iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
  })
  .addFields({
    name: "Ready",
    value: "You can use `/daily` again now.",
    inline: false,
  })
  .setFooter({
    text: "Don't break your streak",
  })
  .setTimestamp()
        ],
      }).catch(() => {});
    }

    await cooldownMsg.edit({
      embeds: [makeCooldownEmbed()],
    }).catch(() => {
      clearInterval(interval);
    });
  }, 5000);

  return;
}

    // reset streak if missed 2 days
    if (diff > COOLDOWN * 2) {
      user.streak = 0;
    }

    user.streak = (user.streak || 0) + 1;

    const bonus = Math.min(user.streak * STREAK_BONUS, MAX_STREAK_BONUS);
    const reward = BASE + bonus;

    user.wallet += reward;
    user.lifetimeEarned = (user.lifetimeEarned || 0) + reward;
    user.cooldowns.daily = new Date();

    const unlocked = awardAchievements(user, ['daily_streak_7', 'daily_streak_30']);
    await user.save();

    const embed = new EmbedBuilder()
      .setColor("#ffd700")
      .setTitle("🎁 Daily Reward Claimed")
      .setDescription(
        `You claimed your daily reward and received **${reward.toLocaleString()} coins**.`
      )
      .addFields(
        {
          name: "💰 Base Reward",
          value: `**${BASE.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "🔥 Streak Bonus",
          value: `**${bonus.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "🎁 Total Reward",
          value: `**${reward.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "🔥 Current Streak",
          value: `**${user.streak.toLocaleString()}** day${user.streak === 1 ? "" : "s"}`,
          inline: true,
        },
        {
          name: "💸 Wallet",
          value: `**${user.wallet.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "⏰ Next Daily",
          value: "**24 hours**",
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