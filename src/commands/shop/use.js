const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../../systems/economy/economyManager');
const shopManager = require('../../systems/shop/shopManager');
const { awardAchievements, ACHIEVEMENTS } = require('../../systems/economy/achievementManager');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function errorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor('#ed4245')
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

function successEmbed(title, description) {
  return new EmbedBuilder()
    .setColor('#57f287')
    .setTitle(`🎒 ${title}`)
    .setDescription(description)
    .setTimestamp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('use')
    .setDescription('Use an inventory item')
    .addStringOption(option =>
      option
        .setName('item')
        .setDescription('Item ID to use')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    const itemId = interaction.options.getString('item');
    const user = await economy.getUser(
      interaction.user.id,
      interaction.guild.id
    );

    const invItem = user.inventory.find(i => i.itemId === itemId);

    if (!invItem) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Item Not Found',
            'You do not own that item.'
          )
        ]
      });
    }

    if (invItem.type !== 'consumable') {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Invalid Item',
            'This item cannot be used.'
          )
        ]
      });
    }

    const shopItem = shopManager.getItemById(itemId);

    if (!shopItem) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Missing Shop Item',
            'This item no longer exists in the shop.'
          )
        ]
      });
    }

    let resultText = '';
    let useUnlocked = [];

    if (shopItem.effect === 'work_multiplier') {
      const expiresAt = new Date(
        Date.now() + shopItem.durationMinutes * 60 * 1000
      );

      user.boosts.workMultiplier = {
        multiplier: shopItem.multiplier,
        expiresAt
      };

      resultText =
        `You activated **${shopItem.multiplier}x Work Multiplier** for **${shopItem.durationMinutes} minutes**.`;
      useUnlocked = awardAchievements(user, ['boost_user']);
    }

    if (shopItem.effect === 'gambling_multiplier') {
      const expiresAt = new Date(
        Date.now() + shopItem.durationMinutes * 60 * 1000
      );

      user.boosts.gamblingMultiplier = {
        multiplier: shopItem.multiplier,
        expiresAt
      };

      resultText =
        `You activated **${shopItem.multiplier}x Gambling Multiplier** for **${shopItem.durationMinutes} minutes**.`;
      useUnlocked = awardAchievements(user, ['boost_user']);
    }

    if (shopItem.effect === 'mystery_box') {
      const reward = randomInt(2000, 20000);

      user.wallet += reward;
      useUnlocked = awardAchievements(user, ['lucky_break']);

      resultText =
        `You opened a **Mystery Box** and won **${reward.toLocaleString()} coins**.`;
    }

    if (!resultText) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'No Effect',
            'This item does not have a usable effect yet.'
          )
        ]
      });
    }

    invItem.quantity -= 1;

    if (invItem.quantity <= 0) {
      user.inventory = user.inventory.filter(
        i => i.itemId !== itemId
      );
    }

    await user.save();

    const remaining =
      user.inventory.find(i => i.itemId === itemId)?.quantity || 0;

    const embed = successEmbed(
      'Item Used',
      resultText
    )
      .addFields(
        {
          name: '📦 Item',
          value: `**${shopItem.name}**`,
          inline: true
        },
        {
          name: '📊 Remaining',
          value: `**${remaining}**`,
          inline: true
        }
      )
      .setThumbnail(
        interaction.user.displayAvatarURL({ dynamic: true })
      )
      .setFooter({
        text: `${interaction.user.username} • Economy System`
      });

    if (useUnlocked?.length) {
      embed.addFields({
        name: '🏅 Achievement Unlocked',
        value: useUnlocked
          .map(id => {
            const achievement = ACHIEVEMENTS[id];
            return achievement ? `${achievement.emoji} ${achievement.name}` : `🏅 ${id}`;
          })
          .join('\n'),
        inline: false,
      });
    }

    await interaction.editReply({
      embeds: [embed]
    });
  }
};