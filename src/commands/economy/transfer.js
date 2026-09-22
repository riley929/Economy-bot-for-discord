const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../../systems/economy/economyManager");
const { flag } = require("../../systems/antiAbuse/exploitDetector");

const TRANSFER_TAX = 0.05;
const MAX_TRANSFER = 250000;

function errorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor("#ed4245")
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("transfer")
    .setDescription("Send coins to another user with a small tax")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("User to send coins to")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("amount")
        .setDescription("Amount to send")
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    const target = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");

    if (target.bot) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            "❌ Invalid Transfer",
            "You cannot transfer money to bots."
          ),
        ],
      });
    }

    if (target.id === interaction.user.id) {
      await flag(
        interaction.user.id,
        interaction.guild.id,
        "Tried to transfer money to self"
      );

      return interaction.editReply({
        embeds: [
          errorEmbed(
            "❌ Invalid Transfer",
            "You cannot transfer money to yourself."
          ),
        ],
      });
    }

    if (amount > MAX_TRANSFER) {
      await flag(
        interaction.user.id,
        interaction.guild.id,
        `Transfer over max limit: ${amount}`
      );

      return interaction.editReply({
        embeds: [
          errorEmbed(
            "❌ Transfer Too Large",
            `The max transfer limit is **${MAX_TRANSFER.toLocaleString()} coins**.\n\n` +
              `You tried to send **${amount.toLocaleString()} coins**.`
          ),
        ],
      });
    }

    const sender = await economy.getUser(interaction.user.id, interaction.guild.id);
    const receiver = await economy.getUser(target.id, interaction.guild.id);

    if (sender.wallet < amount) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            "❌ Not Enough Coins",
            `You do not have enough coins in your wallet.\n\n` +
              `💸 Your Wallet: **${sender.wallet.toLocaleString()} coins**\n` +
              `📤 Transfer Amount: **${amount.toLocaleString()} coins**\n\n` +
              `Need more wallet money? Use:\n\`/withdraw amount:all\``
          ),
        ],
      });
    }

    const tax = Math.ceil(amount * TRANSFER_TAX);
    const received = amount - tax;

    if (received <= 0) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            "❌ Transfer Too Small",
            "After tax, the receiver would get **0 coins**. Try sending a higher amount."
          ),
        ],
      });
    }

    sender.wallet -= amount;
    receiver.wallet += received;

    await sender.save();
    await receiver.save();

    const embed = new EmbedBuilder()
      .setColor("#5865f2")
      .setTitle("💸 Transfer Complete")
      .setDescription(
        `${interaction.user} sent coins to ${target}.`
      )
      .addFields(
        {
          name: "📤 Sent",
          value: `**${amount.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "🔥 Tax Burned",
          value: `**${tax.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "📥 Received",
          value: `**${received.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "💸 Your Wallet",
          value: `**${sender.wallet.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "👤 Receiver",
          value: `${target}`,
          inline: true,
        },
        {
          name: "💰 Tax Rate",
          value: `**${(TRANSFER_TAX * 100).toFixed(0)}%**`,
          inline: true,
        }
      )
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};