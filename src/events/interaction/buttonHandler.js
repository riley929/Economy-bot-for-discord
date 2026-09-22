const economy = require('../../systems/economy/economyManager');
const blackjackCommand = require('../../commands/gambling/blackjack');
const { handValue } = require('../../systems/gambling/blackjackEngine');
const { addGamblingStat } = require('../../systems/gambling/jackpotManager');
const { sendLog } = require('../../utils/logger');

async function finishGame(interaction, game, resultText, color) {
  blackjackCommand.games.delete(game.userId);

  await interaction.update({
    embeds: [blackjackCommand.createGameEmbed(game, true, resultText, color)],
    components: blackjackCommand.buttons(true)
  });
}

module.exports = {
  name: 'interactionCreate',

  async execute(interaction) {
    if (!interaction.isButton()) return;
    if (!['blackjack_hit', 'blackjack_stand'].includes(interaction.customId)) return;

    const game = blackjackCommand.games.get(interaction.user.id);

    if (!game) {
      return interaction.reply({
        content: '❌ This blackjack game is no longer active.',
        ephemeral: true
      });
    }

    if (interaction.user.id !== game.userId) {
      return interaction.reply({
        content: '❌ This is not your blackjack game.',
        ephemeral: true
      });
    }

if (interaction.customId === 'blackjack_hit') {
  game.playerHand.push(game.deck.pop());

  const value = handValue(game.playerHand);

  // Auto-win if player reaches exactly 21
  if (value === 21) {
    const user = await economy.getUser(game.userId, game.guildId);

    const payout = game.bet * 2;

    user.wallet += payout;
    await user.save();

    await addGamblingStat(game.guildId, 'win', game.bet, payout);

    await sendLog(interaction, {
      title: '🃏 Blackjack',
      color: '#57f287',
      fields: [
        { name: 'Bet', value: `${game.bet.toLocaleString()} coins`, inline: true },
        { name: 'Outcome', value: '21 / WIN', inline: true },
        { name: 'Payout', value: `${payout.toLocaleString()} coins`, inline: true }
      ]
    });

    return finishGame(
      interaction,
      game,
      `🖤 You reached **21** and won **${payout.toLocaleString()} coins**!`,
      '#57f287'
    );
  }

  // Bust
  if (value > 21) {
    await addGamblingStat(game.guildId, 'loss', game.bet, 0);

    await sendLog(interaction, {
      title: '🃏 Blackjack',
      color: '#ed4245',
      fields: [
        { name: 'Bet', value: `${game.bet.toLocaleString()} coins`, inline: true },
        { name: 'Outcome', value: 'BUST / LOSS', inline: true },
        { name: 'Payout', value: '0 coins', inline: true }
      ]
    });

    return finishGame(
      interaction,
      game,
      `💥 You busted and lost **${game.bet.toLocaleString()} coins**.`,
      '#ed4245'
    );
  }

  return interaction.update({
    embeds: [blackjackCommand.createGameEmbed(game)],
    components: blackjackCommand.buttons()
  });
}

    if (interaction.customId === 'blackjack_stand') {
      while (handValue(game.dealerHand) < 17) {
        game.dealerHand.push(game.deck.pop());
      }

      const playerValue = handValue(game.playerHand);
      const dealerValue = handValue(game.dealerHand);
      const user = await economy.getUser(game.userId, game.guildId);

      if (dealerValue > 21 || playerValue > dealerValue) {
        const payout = game.bet * 2;
user.wallet += payout;
        
        await user.save();
        await addGamblingStat(game.guildId, 'win', game.bet, payout);

        await sendLog(interaction, {
          title: '🃏 Blackjack',
          color: '#57f287',
          fields: [
            { name: 'Bet', value: `${game.bet.toLocaleString()} coins`, inline: true },
            { name: 'Outcome', value: 'WIN', inline: true },
            { name: 'Payout', value: `${payout.toLocaleString()} coins`, inline: true },
            { name: 'Player Value', value: `${playerValue}`, inline: true },
            { name: 'Dealer Value', value: `${dealerValue}`, inline: true }
          ]
        });

        return finishGame(
          interaction,
          game,
          `✅ You won **${payout.toLocaleString()} coins**!`,
          '#57f287'
        );
      }

      if (playerValue === dealerValue) {
        user.wallet += game.bet;
        await user.save();
        await addGamblingStat(game.guildId, 'tie', game.bet, game.bet);

        await sendLog(interaction, {
          title: '🃏 Blackjack',
          color: '#fee75c',
          fields: [
            { name: 'Bet', value: `${game.bet.toLocaleString()} coins`, inline: true },
            { name: 'Outcome', value: 'PUSH / REFUND', inline: true },
            { name: 'Payout', value: `${game.bet.toLocaleString()} coins`, inline: true },
            { name: 'Player Value', value: `${playerValue}`, inline: true },
            { name: 'Dealer Value', value: `${dealerValue}`, inline: true }
          ]
        });

        return finishGame(
          interaction,
          game,
          '🤝 Push! Your bet was refunded.',
          '#fee75c'
        );
      }

      await addGamblingStat(game.guildId, 'loss', game.bet, 0);

      await sendLog(interaction, {
        title: '🃏 Blackjack',
        color: '#ed4245',
        fields: [
          { name: 'Bet', value: `${game.bet.toLocaleString()} coins`, inline: true },
          { name: 'Outcome', value: 'DEALER WIN / LOSS', inline: true },
          { name: 'Payout', value: '0 coins', inline: true },
          { name: 'Player Value', value: `${playerValue}`, inline: true },
          { name: 'Dealer Value', value: `${dealerValue}`, inline: true }
        ]
      });

      return finishGame(
        interaction,
        game,
        `❌ Dealer wins. You lost **${game.bet.toLocaleString()} coins**.`,
        '#ed4245'
      );
    }
  }
};