const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../../systems/economy/economyManager");
const { checkRate } = require("../../systems/antiAbuse/rateLimiter");
const { flag } = require("../../systems/antiAbuse/exploitDetector");

const COOLDOWN = 5 * 60 * 1000;
const MIN_REWARD = 500;
const MAX_REWARD = 2500;
const MIN_FINE = 300;
const MAX_FINE = 1800;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getWealth(user) {
  return (user.wallet || 0) + (user.bank || 0);
}

function getScaledReward(user) {
  const wealth = getWealth(user);
  const base = randomInt(MIN_REWARD, MAX_REWARD);

  let percent;

  if (wealth < 100_000) percent = randomInt(2, 5) / 100;
  else if (wealth < 1_000_000) percent = randomInt(1, 3) / 100;
  else if (wealth < 100_000_000) percent = randomInt(50, 150) / 10000;
  else percent = randomInt(10, 35) / 10000;

  return Math.max(base, Math.floor(wealth * percent));
}

function getScaledFine(user) {
  const wealth = getWealth(user);

  let percent;

  if (wealth < 100_000) percent = randomInt(3, 7) / 100;
  else if (wealth < 1_000_000) percent = randomInt(5, 10) / 100;
  else if (wealth < 100_000_000) percent = randomInt(7, 12) / 100;
  else percent = randomInt(5, 15) / 100;

  return Math.max(randomInt(MIN_FINE, MAX_FINE), Math.floor(wealth * percent));
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
    .setName("crime")
    .setDescription("Commit a risky crime for money"),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    if (!checkRate(interaction.user.id, "crime", 3, 5000)) {
      await flag(interaction.user.id, interaction.guild.id, "Rate limit hit on crime");

      return interaction.editReply({
        embeds: [
          errorEmbed(
            "⚠️ Slow Down",
            "You are using `/crime` too fast. Chill for a second."
          ),
        ],
      });
    }

    const user = await economy.getUser(interaction.user.id, interaction.guild.id);

    const last = user.cooldowns.crime ? user.cooldowns.crime.getTime() : 0;
    const now = Date.now();
    const remaining = COOLDOWN - (now - last);

    if (remaining > 0) {
      const endTime = last + COOLDOWN;

const makeCooldownEmbed = () => {
  const timeLeft = Math.max(endTime - Date.now(), 0);

  return new EmbedBuilder()
    .setColor("#fee75c")
    .setTitle("🚔 Crime Cooldown")
    .setDescription(
      `The police are still keeping an eye on you.\n\n` +
      `⏰ Time Remaining: **${formatTime(timeLeft)}**`
    )
    .setAuthor({
      name: interaction.user.tag,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
    })
    .addFields({
      name: "Lay Low",
      value: "Wait for the heat to die down before committing another crime.",
      inline: false,
    })
    .setFooter({
      text: "Keep a low profile",
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
          .setTitle("🚔 Crime Ready")
          .setDescription("The heat has died down and it's safe to make another move.")
          .setAuthor({
            name: interaction.user.tag,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
          })
          .addFields({
            name: "Ready",
            value: "You can use `/crime` again now.",
            inline: false,
          })
          .setFooter({
            text: "Stay out of trouble... or don't",
          })
          .setTimestamp(),
      ],
    })
    .catch(() => {});
}

        await cooldownMsg.edit({
          embeds: [makeCooldownEmbed()],
        }).catch(() => {
          clearInterval(interval);
        });
      }, 5000);

      return;
    }

    user.cooldowns.crime = new Date();

    const success = Math.random() < 0.45;

    if (success) {
      const reward = getScaledReward(user);
      user.wallet += reward;

      await user.save();

      const embed = new EmbedBuilder()
        .setColor("#57f287")
        .setTitle("🕵️ Crime Successful")
        .setDescription(
          `You got away with it and earned **${reward.toLocaleString()} coins**.`
        )
        .addFields(
          {
            name: "💰 Reward",
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

      return interaction.editReply({ embeds: [embed] });
    }

    const scaledFine = getScaledFine(user);
    const totalMoney = (user.wallet || 0) + (user.bank || 0);
    const fine = Math.min(totalMoney, scaledFine);

    const fromWallet = Math.min(user.wallet || 0, fine);
    user.wallet -= fromWallet;

    const remainingFine = fine - fromWallet;

    if (remainingFine > 0) {
      user.bank -= remainingFine;
    }

    await user.save();

    const embed = new EmbedBuilder()
      .setColor("#ed4245")
      .setTitle("🚓 Crime Failed")
      .setDescription(
        `You got caught and paid a fine of **${fine.toLocaleString()} coins**.`
      )
      .addFields(
        {
          name: "💵 Wallet Loss",
          value: `**${fromWallet.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "🏦 Bank Loss",
          value: `**${remainingFine.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "📉 Total Fine",
          value: `**${fine.toLocaleString()}** coins`,
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