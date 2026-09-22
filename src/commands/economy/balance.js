const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../../systems/economy/economyManager");

module.exports = {
data: new SlashCommandBuilder()
.setName("balance")
.setDescription("Check your economy balance")
.addUserOption(option =>
option
.setName("user")
.setDescription("User to check")
.setRequired(false)
),

async execute(interaction) {
const target = interaction.options.getUser("user") || interaction.user;


const userData = await economy.getBalance(
  target.id,
  interaction.guild.id
);

const total = (userData.wallet || 0) + (userData.bank || 0);

const bankPercent =
  total > 0
    ? ((userData.bank / total) * 100).toFixed(1)
    : "0.0";

const embed = new EmbedBuilder()
  .setColor("#5865f2")
  .setTitle("💰 Balance Overview")
  .setDescription(
    target.id === interaction.user.id
      ? "Here's your financial overview."
      : `Here's ${target.username}'s financial overview.`
  )
  .setAuthor({
    name: target.tag,
    iconURL: target.displayAvatarURL({ dynamic: true }),
  })
  .addFields(
    {
      name: "💵 Wallet",
      value: `**${userData.wallet.toLocaleString()}** coins`,
      inline: true,
    },
    {
      name: "🏦 Bank",
      value: `**${userData.bank.toLocaleString()}** coins`,
      inline: true,
    },
    {
      name: "💰 Net Worth",
      value: `**${total.toLocaleString()}** coins`,
      inline: true,
    },
    {
      name: "⭐ Level",
      value: `**${userData.level || 0}**`,
      inline: true,
    },
    {
      name: "🔥 Streak",
      value: `**${userData.streak || 0}**`,
      inline: true,
    },
    {
      name: "📊 Banked",
      value: `**${bankPercent}%**`,
      inline: true,
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

await interaction.reply({
  embeds: [embed],
});
},
};
