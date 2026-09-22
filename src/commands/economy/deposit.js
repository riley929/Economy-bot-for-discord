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
    .setName("deposit")
    .setDescription("Deposit wallet money into your bank")
    .addStringOption(option =>
      option
        .setName("amount")
        .setDescription('Amount to deposit, or "all"')
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
      amount = user.wallet;
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

    if (user.wallet < amount) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            "❌ Not Enough Wallet Money",
            `You only have **${user.wallet.toLocaleString()} coins** in your wallet.\n\n` +
              `You tried to deposit **${amount.toLocaleString()} coins**.`
          ),
        ],
      });
    }

    user.wallet -= amount;
    user.bank += amount;

    await user.save();

    const embed = new EmbedBuilder()
      .setColor("#57f287")
      .setTitle("🏦 Deposit Complete")
      .setDescription(
        `You deposited **${amount.toLocaleString()} coins** into your bank.`
      )
      .addFields(
        {
          name: "📥 Deposited",
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
          value: `**${((user.wallet || 0) + (user.bank || 0)).toLocaleString()}** coins`,
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