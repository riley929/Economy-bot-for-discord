const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { applyGamblingMultiplier,} = require("../../systems/gambling/gamblingMultiplier");
const economy = require("../../systems/economy/economyManager");
const { checkBet } = require("../../systems/antiAbuse/fraudCheck");
const { checkRate } = require("../../systems/antiAbuse/rateLimiter");
const { flag } = require("../../systems/antiAbuse/exploitDetector");
const {
  createDeck,
  handValue,
  formatHand,
} = require("../../systems/gambling/blackjackEngine");
const { addGamblingStat } = require("../../systems/gambling/jackpotManager");
const { MIN_BET, MAX_BET, COOLDOWNS, BLACKJACK_ODDS } = require("../../config/gambling");
const { notEnoughMoney, rateLimited } = require("../../utils/errors");

const games = new Map();

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

function createGameEmbed(
  game,
  revealDealer = false,
  resultText = null,
  color = "#2b2d31"
) {
  const playerValue = handValue(game.playerHand);
  const dealerValue = revealDealer ? handValue(game.dealerHand) : "?";

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle("🃏 Blackjack")
    .setDescription(
      resultText
        ? resultText
        : "Choose whether to **Hit** or **Stand**."
    )
    .addFields(
      {
        name: "💰 Bet",
        value: `**${game.bet.toLocaleString()}** coins`,
        inline: true,
      },
      {
        name: "👤 Player",
        value: `<@${game.userId}>`,
        inline: true,
      },
      {
        name: "🎲 Status",
        value: resultText ? "**Finished**" : "**In Progress**",
        inline: true,
      },
      {
        name: "🧍 Your Hand",
        value:
          `${formatHand(game.playerHand)}\n` +
          `Value: **${playerValue}**`,
        inline: false,
      },
      {
        name: "🏦 Dealer Hand",
        value:
          `${formatHand(game.dealerHand, !revealDealer)}\n` +
          `Value: **${dealerValue}**`,
        inline: false,
      }
    )
    .setTimestamp();

  return embed;
}

function buttons(disabled = false) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("blackjack_hit")
        .setLabel("Hit")
        .setEmoji("🃏")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled),

      new ButtonBuilder()
        .setCustomId("blackjack_stand")
        .setLabel("Stand")
        .setEmoji("✋")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled)
    ),
  ];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("blackjack")
    .setDescription("Play blackjack against the dealer")
    .addIntegerOption(option =>
      option
        .setName("bet")
        .setDescription("Amount to bet")
        .setRequired(true)
        .setMinValue(MIN_BET)
        .setMaxValue(MAX_BET)
    ),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    if (!checkRate(interaction.user.id, "blackjack")) {
      await flag(
        interaction.user.id,
        interaction.guild.id,
        "Rate limit hit on blackjack"
      );

      return interaction.editReply({
        embeds: [rateLimited()],
      });
    }

    const bet = interaction.options.getInteger("bet");
    const user = await economy.getUser(interaction.user.id, interaction.guild.id);

    const last = user.cooldowns.blackjack
      ? user.cooldowns.blackjack.getTime()
      : 0;

    const now = Date.now();
    const remaining = COOLDOWNS.blackjack - (now - last);

    if (remaining > 0) {
      const endTime = last + COOLDOWNS.blackjack;

      const makeCooldownEmbed = () => {
        const timeLeft = Math.max(endTime - Date.now(), 0);

        return new EmbedBuilder()
          .setColor("#fee75c")
          .setTitle("⏳ Blackjack Cooldown")
          .setDescription(
            `You already played blackjack recently.\n\n` +
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
                  .setTitle("✅ Blackjack Ready")
                  .setDescription("You can use `/blackjack` again now.")
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

    if (!checkBet(user, bet)) {
      await flag(
        interaction.user.id,
        interaction.guild.id,
        `Invalid blackjack bet: ${bet}`
      );

      return interaction.editReply({
        embeds: [notEnoughMoney(bet, user)],
      });
    }

    user.wallet -= bet;
    user.cooldowns.blackjack = new Date();
    await user.save();

    const deck = createDeck();

    const game = {
      userId: interaction.user.id,
      guildId: interaction.guild.id,
      bet,
      deck,
      playerHand: [deck.pop(), deck.pop()],
      dealerHand: [deck.pop(), deck.pop()],
    };

    games.set(interaction.user.id, game);

    if (handValue(game.playerHand) === 21) {
      game.dealerHand = game.dealerHand.slice(0, 2);

      const basePayout = Math.floor(bet * 2);

const {
  multiplier,
  finalPayout: payout,
  bonus,
} = applyGamblingMultiplier(user, basePayout);;
      const shouldWin = Math.random() < BLACKJACK_ODDS.winChance;

      if (shouldWin) {
        user.wallet += payout;
        await user.save();
        await addGamblingStat(interaction.guild.id, "win", bet, payout);
        games.delete(interaction.user.id);

        return interaction.editReply({
          embeds: [
            createGameEmbed(
              game,
              true,
              `🖤 **Blackjack!** You won **${payout.toLocaleString()} coins**.\n\n` +
                `💰 Net Profit: **${bet.toLocaleString()} coins**\n` +
                `💸 Wallet: **${user.wallet.toLocaleString()} coins**`,
              "#57f287"
            ),
          ],
          components: buttons(true),
        });
      }

      await addGamblingStat(interaction.guild.id, "loss", bet, 0);
      games.delete(interaction.user.id);

      return interaction.editReply({
        embeds: [
          createGameEmbed(
            game,
            true,
            `💥 **Blackjack loss.** You lost **${bet.toLocaleString()} coins**.\n\n` +
              `💸 Wallet: **${user.wallet.toLocaleString()} coins**`,
            "#ed4245"
          ),
        ],
        components: buttons(true),
      });
    }

    const embed = createGameEmbed(game)
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
      });

    return interaction.editReply({
      embeds: [embed],
      components: buttons(),
    });
  },

  games,
  createGameEmbed,
  buttons,
};