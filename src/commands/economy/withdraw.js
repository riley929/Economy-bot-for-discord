const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../../systems/economy/economyManager");

function errorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor("#ed4245")
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("withdraw")
    .setDescription("Withdraw bank money into your wallet")
    .addStringOption(option =>
      option
        .setName("amount")
        .setDescription('Amount to withdraw, or "all"')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    const amountInput = interaction.options.getString("amount");
    const user = await economy.getUser(interaction.user.id, interaction.guild.id);

    let amount;

    if (amountInput.toLowerCase() === "all") {
      amount = user.bank;
    } else {
      amount = Number(amountInput);
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            "❌ Invalid Amount",
            'Please enter a valid whole number, or use `"all"`.'
          ),
        ],
      });
    }

    if (user.bank < amount) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            "❌ Not Enough Bank Money",
            `You only have **${user.bank.toLocaleString()} coins** in your bank.\n\n` +
              `Try using:\n\`/withdraw amount:all\``
          ),
        ],
      });
    }

    if (user.bank - amount < 0) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            "❌ Withdrawal Blocked",
            'You cannot withdraw while your bank balance is negative.'
          ),
        ],
      });
    }

    user.bank -= amount;
    user.wallet += amount;
    await user.save();

const embed = new EmbedBuilder()
.setColor("#57f287")
.setTitle("🏦 Withdraw Complete")
.setDescription(
`You withdrew **${amount.toLocaleString()} coins** from your bank.`
)
.addFields(
{
name: "📤 Withdrawn",
value: `**${amount.toLocaleString()}** coins`,
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
value: `**${(
        (user.wallet || 0) +
        (user.bank || 0)
      ).toLocaleString()}** coins`,
inline: true,
}
)
.setThumbnail(
interaction.user.displayAvatarURL({ dynamic: true })
)
.setFooter({
text: `Requested by ${interaction.user.tag}`,
iconURL: interaction.user.displayAvatarURL({
dynamic: true,
}),
})
.setTimestamp();


    return interaction.editReply({ embeds: [embed] });
  },
};