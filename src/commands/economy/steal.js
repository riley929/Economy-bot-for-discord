const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../../systems/economy/economyManager");
const { checkRate } = require("../../systems/antiAbuse/rateLimiter");
const { flag } = require("../../systems/antiAbuse/exploitDetector");

const COOLDOWN = 60 * 60 * 1000;
const MIN_TARGET_WALLET = 1000;
const SUCCESS_CHANCE = 0.35;
const STEAL_PERCENT = 0.15;
const FAIL_PERCENT = 0.25;
const MAX_STEAL_AMOUNT = 500000;


function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function getWealth(user) {
  return (user.wallet || 0) + (user.bank || 0);
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
    .setName("steal")
    .setDescription("Try to steal coins from another user")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("User to steal from")
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    if (!checkRate(interaction.user.id, "steal", 4, 10_000)) {
      await flag(interaction.user.id, interaction.guild.id, "Rate limit hit on steal");

      return interaction.editReply({
        embeds: [
          errorEmbed(
            "⚠️ Slow Down",
            "You are using `/steal` too fast. Chill for a second."
          ),
        ],
      });
    }

    const target = interaction.options.getUser("user");

    if (target.bot) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            "❌ Invalid Target",
            "You cannot steal from bots."
          ),
        ],
      });
    }

    if (target.id === interaction.user.id) {
      await flag(interaction.user.id, interaction.guild.id, "Tried to steal from self");

      return interaction.editReply({
        embeds: [
          errorEmbed(
            "❌ Invalid Target",
            "You cannot steal from yourself."
          ),
        ],
      });
    }

    const thief = await economy.getUser(interaction.user.id, interaction.guild.id);
    const victim = await economy.getUser(target.id, interaction.guild.id);

    const last = thief.cooldowns.steal ? thief.cooldowns.steal.getTime() : 0;
    const now = Date.now();
    const remaining = COOLDOWN - (now - last);

    if (remaining > 0) {
      const endTime = last + COOLDOWN;

      const makeCooldownEmbed = () => {
        const timeLeft = Math.max(endTime - Date.now(), 0);

        return new EmbedBuilder()
          .setColor("#fee75c")
          .setTitle("⏳ Steal Cooldown")
          .setDescription(
            `You already tried stealing recently.\n\n` +
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
                  .setTitle("✅ Steal Ready")
                  .setDescription("You can use `/steal` again now.")
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

    if (victim.wallet < MIN_TARGET_WALLET) {
      const noMoneyEmbed = new EmbedBuilder()
        .setColor("#ed4245")
        .setTitle("❌ Not Enough To Steal")
        .setDescription(
          `${target} needs at least **${MIN_TARGET_WALLET.toLocaleString()} coins** in their wallet to steal from.`
        )
        .addFields(
          {
            name: "Target Wallet",
            value: `**${victim.wallet.toLocaleString()}** coins`,
            inline: true,
          },
          {
            name: "Required",
            value: `**${MIN_TARGET_WALLET.toLocaleString()}** coins`,
            inline: true,
          }
        )
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp();

      return interaction.editReply({ embeds: [noMoneyEmbed] });
    }

    thief.cooldowns.steal = new Date();

    const success = Math.random() < SUCCESS_CHANCE;

    if (success) {
      const stolen = Math.min(
  MAX_STEAL_AMOUNT,
  Math.max(1, Math.floor(victim.wallet * STEAL_PERCENT))
);

victim.wallet -= stolen;
thief.wallet += stolen;

      await victim.save();
      await thief.save();

      const embed = new EmbedBuilder()
        .setColor("#57f287")
        .setTitle("🦹 Steal Successful")
        .setDescription(
          `You stole **${stolen.toLocaleString()} coins** from ${target}.`
        )
        .addFields(
          {
            name: "💰 Stolen",
            value: `**${stolen.toLocaleString()}** coins`,
            inline: true,
          },
          {
            name: "💸 Your Wallet",
            value: `**${thief.wallet.toLocaleString()}** coins`,
            inline: true,
          },
          {
            name: "🏦 Your Bank",
            value: `**${thief.bank.toLocaleString()}** coins`,
            inline: true,
          },
          {
            name: "🎯 Target Wallet",
            value: `**${victim.wallet.toLocaleString()}** coins`,
            inline: true,
          },
          {
            name: "📊 Your Net Worth",
            value: `**${getWealth(thief).toLocaleString()}** coins`,
            inline: true,
          },
          {
            name: "⏰ Cooldown",
            value: "**1 hour**",
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

    const fine = Math.max(
  1,
  Math.floor(thief.wallet * FAIL_PERCENT)
);

thief.wallet -= fine;

    await thief.save();

    const embed = new EmbedBuilder()
      .setColor("#ed4245")
      .setTitle("🚓 Steal Failed")
      .setDescription(
        `You got caught trying to steal from ${target} and paid **${fine.toLocaleString()} coins**.`
      )
      .addFields(
        {
          name: "📉 Fine",
          value: `**${fine.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "💸 Your Wallet",
          value: `**${thief.wallet.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "🏦 Your Bank",
          value: `**${thief.bank.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "📊 Your Net Worth",
          value: `**${getWealth(thief).toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "⏰ Cooldown",
          value: "**1 hour**",
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