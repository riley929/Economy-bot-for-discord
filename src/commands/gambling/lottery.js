const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../../systems/economy/economyManager");
const { checkRate } = require("../../systems/antiAbuse/rateLimiter");
const { flag } = require("../../systems/antiAbuse/exploitDetector");
const { addGamblingStat } = require("../../systems/gambling/jackpotManager");
const { COOLDOWNS } = require("../../config/gambling");
const { rateLimited } = require("../../utils/errors");
const { sendLog } = require("../../utils/logger");

const TICKET_PRICE = 1000;
const JACKPOT = 25000;
const SMALL_WIN = 5000;

function randomNumber() {
  return Math.floor(Math.random() * 100) + 1;
}

function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function notEnoughTicketMoney(user) {
  return new EmbedBuilder()
    .setColor("#ed4245")
    .setTitle("❌ Not Enough Money")
    .setDescription(
      `You need **${TICKET_PRICE.toLocaleString()} coins** to buy a lottery ticket, but you only have **${user.wallet.toLocaleString()} coins** in your wallet.`
    )
    .addFields(
      {
        name: "🎟️ Ticket Price",
        value: `**${TICKET_PRICE.toLocaleString()}** coins`,
        inline: true,
      },
      {
        name: "💸 Your Wallet",
        value: `**${user.wallet.toLocaleString()}** coins`,
        inline: true,
      },
      {
        name: "🏦 Your Bank",
        value: `**${user.bank.toLocaleString()}** coins`,
        inline: true,
      },
      {
        name: "Need More Wallet Money?",
        value:
          "Use `/withdraw amount:all`, or earn more with `/work`, `/daily`, or `/weekly`.",
        inline: false,
      }
    )
    .setTimestamp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lottery")
    .setDescription("Buy a lottery ticket for a chance to win")
    .addIntegerOption(option =>
      option
        .setName("number")
        .setDescription("Pick a number from 1 to 100")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    if (!checkRate(interaction.user.id, "lottery")) {
      await flag(interaction.user.id, interaction.guild.id, "Rate limit hit on lottery");

      return interaction.editReply({
        embeds: [rateLimited()],
      });
    }

    const picked = interaction.options.getInteger("number");
    const user = await economy.getUser(interaction.user.id, interaction.guild.id);

    const last = user.cooldowns.lottery ? user.cooldowns.lottery.getTime() : 0;
    const now = Date.now();
    const remaining = COOLDOWNS.lottery - (now - last);

    if (remaining > 0) {
      const endTime = last + COOLDOWNS.lottery;

      const makeCooldownEmbed = () => {
        const timeLeft = Math.max(endTime - Date.now(), 0);

        return new EmbedBuilder()
          .setColor("#fee75c")
          .setTitle("⏳ Lottery Cooldown")
          .setDescription(
            `You already bought a lottery ticket recently.\n\n` +
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
                  .setTitle("✅ Lottery Ready")
                  .setDescription("You can use `/lottery` again now.")
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

    if (user.wallet < TICKET_PRICE) {
      return interaction.editReply({
        embeds: [notEnoughTicketMoney(user)],
      });
    }

    // SAME GAMEPLAY / SAME ODDS
    const winning = randomNumber();

    user.wallet -= TICKET_PRICE;
    user.cooldowns.lottery = new Date();

    let payout = 0;
    let resultText = `❌ No win. The winning number was **${winning}**.`;
    let color = "#ed4245";
    let outcome = "loss";

    if (picked === winning) {
      payout = JACKPOT;
      user.wallet += payout;
      resultText = `🎉 JACKPOT! You picked **${picked}** and won **${payout.toLocaleString()} coins**!`;
      color = "#ffd700";
      outcome = "win";
    } else if (Math.abs(picked - winning) <= 2) {
      payout = SMALL_WIN;
      user.wallet += payout;
      resultText = `✨ Close enough! Winning number was **${winning}**. You won **${payout.toLocaleString()} coins**!`;
      color = "#57f287";
      outcome = "win";
    }

    await user.save();
    await addGamblingStat(interaction.guild.id, outcome, TICKET_PRICE, payout);

    await sendLog(interaction, {
      title: "🎟️ Lottery",
      color: outcome === "win" ? "#57f287" : "#ed4245",
      fields: [
        { name: "Picked", value: `${picked}`, inline: true },
        { name: "Winning Number", value: `${winning}`, inline: true },
        { name: "Outcome", value: outcome.toUpperCase(), inline: true },
        { name: "Ticket Price", value: `${TICKET_PRICE.toLocaleString()} coins`, inline: true },
        { name: "Payout", value: `${payout.toLocaleString()} coins`, inline: true },
      ],
    });

    const profit = payout - TICKET_PRICE;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle("🎟️ Lottery")
      .setDescription(resultText)
      .addFields(
        {
          name: "🎟️ Ticket Price",
          value: `**${TICKET_PRICE.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "🔢 Your Number",
          value: `**${picked}**`,
          inline: true,
        },
        {
          name: "🏆 Winning Number",
          value: `**${winning}**`,
          inline: true,
        },
        {
          name: "📊 Outcome",
          value: `**${outcome.toUpperCase()}**`,
          inline: true,
        },
        {
          name: "🎁 Payout",
          value: `**${payout.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: outcome === "win" ? "📈 Profit" : "📉 Lost",
          value:
            outcome === "win"
              ? `**${profit.toLocaleString()}** coins`
              : `**${TICKET_PRICE.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "💸 Wallet",
          value: `**${user.wallet.toLocaleString()}** coins`,
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