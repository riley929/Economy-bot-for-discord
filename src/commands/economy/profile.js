const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../../systems/economy/economyManager");
const { xpNeeded } = require("../../systems/economy/levelManager");
const { formatAchievements } = require("../../systems/economy/achievementManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View your economy profile")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("User to view")
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    const target =
      interaction.options.getUser("user") || interaction.user;

    const user = await economy.getUser(
      target.id,
      interaction.guild.id
    );

    const needed = xpNeeded(user.level);

    const total =
      (user.wallet || 0) +
      (user.bank || 0);

    const achievementCount = (user.achievements || []).length;
    const achievements = formatAchievements(user);
    const activeBoosts = [];
    const now = Date.now();

    if (user.boosts?.workMultiplier?.expiresAt) {
      const expire = new Date(user.boosts.workMultiplier.expiresAt).getTime();
      if (expire > now) {
        activeBoosts.push(`Work x${user.boosts.workMultiplier.multiplier} until <t:${Math.floor(expire / 1000)}:R>`);
      }
    }

    if (user.boosts?.gamblingMultiplier?.expiresAt) {
      const expire = new Date(user.boosts.gamblingMultiplier.expiresAt).getTime();
      if (expire > now) {
        activeBoosts.push(`Gambling x${user.boosts.gamblingMultiplier.multiplier} until <t:${Math.floor(expire / 1000)}:R>`);
      }
    }

    const titles = [
      '🌱 Beginner',
      '⚡ Experienced',
      '💎 Advanced',
      '🏆 Veteran',
      '🌟 Legend'
    ];

    const rankName =
      user.level >= 100
        ? titles[4]
        : user.level >= 50
        ? titles[3]
        : user.level >= 25
        ? titles[2]
        : user.level >= 10
        ? titles[1]
        : titles[0];

    const xpPercent = Math.min(
      ((user.xp || 0) / needed) * 100,
      100
    ).toFixed(1);

    const progress = Math.min(
      Math.floor(((user.xp || 0) / needed) * 10),
      10
    );

    const xpBar =
      "█".repeat(progress) +
      "░".repeat(10 - progress);

    const status = rankName;
    const achievementsValue = achievementCount > 0
      ? `${achievementCount} unlocked`
      : 'None yet';

    const embed = new EmbedBuilder()
      .setColor("#5865f2")
      .setTitle("👤 Economy Profile")
      .setDescription(
        target.id === interaction.user.id
          ? "Here's your economy profile."
          : `Here's ${target.username}'s economy profile.`
      )
      .setAuthor({
        name: target.tag,
        iconURL: target.displayAvatarURL({ dynamic: true }),
      })
      .addFields(
        {
          name: "💵 Wallet",
          value: `**${user.wallet.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "🏦 Bank",
          value: `**${user.bank.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "💰 Net Worth",
          value: `**${total.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "⭐ Level",
          value: `**${user.level}**`,
          inline: true,
        },
        {
          name: "✨ XP",
          value: `**${user.xp.toLocaleString()} / ${needed.toLocaleString()}**`,
          inline: true,
        },
        {
          name: "📊 Progress",
          value: `**${xpPercent}%**`,
          inline: true,
        },
        {
          name: "📈 Level Progress",
          value: `${xpBar} **${xpPercent}%**`,
          inline: false,
        },
        {
          name: "🔥 Daily Streak",
          value: `**${user.streak || 0}**`,
          inline: true,
        },
        {
          name: "🏅 Achievements",
          value: achievements.slice(0, 3).join("\n"),
          inline: false,
        },
        {
          name: "📊 Lifetime Earned",
          value: `**${(user.lifetimeEarned || 0).toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "💸 Lifetime Spent",
          value: `**${(user.lifetimeSpent || 0).toLocaleString()}**`,
          inline: true,
        },
        {
          name: "🎯 Status",
          value: status,
          inline: true,
        }
      )
      .addFields(
        {
          name: "🔋 Active Boosts",
          value: activeBoosts.length ? activeBoosts.join("\n") : "None",
          inline: false
        },
        {
          name: "🏆 Titles",
          value: achievements.slice(0, 5).join("\n"),
          inline: false
        }
      )
      .setThumbnail(
        target.displayAvatarURL({ dynamic: true })
      )
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL({
          dynamic: true,
        }),
      })
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed],
    });
  },
};