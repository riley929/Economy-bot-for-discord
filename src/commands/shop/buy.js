const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const shopManager = require('../../systems/shop/shopManager');

function errorEmbed(title, description) {
return new EmbedBuilder()
.setColor('#ed4245')
.setTitle(`❌ ${title}`)
.setDescription(description)
.setTimestamp();
}

module.exports = {
data: new SlashCommandBuilder()
.setName('buy')
.setDescription('Buy an item from the shop')
.addStringOption(option =>
option
.setName('item')
.setDescription('Item ID from /shop')
.setRequired(true)
)
.addIntegerOption(option =>
option
.setName('quantity')
.setDescription('Amount to buy')
.setRequired(false)
.setMinValue(1)
.setMaxValue(10)
),

async execute(interaction) {
if (!interaction.deferred && !interaction.replied) {
await interaction.deferReply();
}


const itemId = interaction.options.getString('item');
const quantity = interaction.options.getInteger('quantity') || 1;

const item = shopManager.getItemById(itemId);

if (item?.type === 'role' && quantity > 1) {
  return interaction.editReply({
    embeds: [
      errorEmbed(
        'Invalid Quantity',
        'You can only purchase **1 role** at a time.'
      )
    ]
  });
}

const dailyDeal = shopManager.getDailyDeal(interaction.guild.id);
const discount = dailyDeal?.id === itemId ? 0.25 : 0;
const result = await shopManager.buyItem(
  interaction.user.id,
  interaction.guild.id,
  itemId,
  quantity,
  { discount }
);

if (!result.success) {
  if (result.reason === 'ITEM_NOT_FOUND') {
    return interaction.editReply({
      embeds: [
        errorEmbed(
          'Item Not Found',
          'That item does not exist. Use `/shop` to view available items.'
        )
      ]
    });
  }

  if (result.reason === 'EXTERNAL_ITEM') {
    return interaction.editReply({
      embeds: [
        errorEmbed(
          'External Item',
          'This reward must be purchased using `/order`.'
        )
      ]
    });
  }

  if (result.reason === 'NOT_ENOUGH_MONEY') {
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor('#ed4245')
          .setTitle('💸 Insufficient Funds')
          .setDescription(
            `You don't have enough coins for this purchase.`
          )
          .addFields(
            {
              name: '💰 Required',
              value: `**${result.totalPrice.toLocaleString()}** coins`,
              inline: true
            },
            {
              name: '👛 Wallet',
              value: `**${result.user.wallet.toLocaleString()}** coins`,
              inline: true
            },
            {
              name: '📉 Missing',
              value: `**${(result.totalPrice - result.user.wallet).toLocaleString()}** coins`,
              inline: true
            }
          )
          .setThumbnail(
            interaction.user.displayAvatarURL({ dynamic: true })
          )
          .setTimestamp()
      ]
    });
  }

  return interaction.editReply({
    embeds: [
      errorEmbed(
        'Purchase Failed',
        'Something went wrong while processing your purchase.'
      )
    ]
  });
}

const isRole = result.item.type === 'role';
const unlocked = Array.isArray(result.unlockedAchievements) ? result.unlockedAchievements : [];

const embed = new EmbedBuilder()
  .setColor('#57f287')
  .setThumbnail(
    interaction.user.displayAvatarURL({ dynamic: true })
  )
  .setTimestamp()
  .setFooter({
    text: `${interaction.user.username} • Economy Shop`
  });

if (isRole) {
  embed
    .setTitle('🏷️ Role Purchased')
    .setDescription(
      `You successfully purchased **${result.item.name}**.`
    )
    .addFields(
      {
        name: '💰 Cost',
        value: `**${result.totalPrice.toLocaleString()}** coins${discount ? ' (Daily Deal)' : ''}`,
        inline: true
      },
      {
        name: '👛 Wallet',
        value: `**${result.user.wallet.toLocaleString()}** coins`,
        inline: true
      },
      {
        name: '📦 Quantity',
        value: '**1**',
        inline: true
      },
      {
        name: '⚠️ Important',
        value:
          'This role is **not assigned automatically**.\nPlease contact <@1370378862579679232> or <@478259106910699532> to receive your role.',
        inline: false
      }
    );
} else {
  embed
    .setTitle('🛒 Purchase Complete')
    .setDescription(
      `Successfully purchased **${quantity}x ${result.item.name}**${discount ? ' at a discounted price!' : ''}`
    )
    .addFields(
      {
        name: '📦 Item',
        value: `**${result.item.name}**`,
        inline: true
      },
      {
        name: '🔢 Quantity',
        value: `**${quantity}**`,
        inline: true
      },
      {
        name: '💰 Cost',
        value: `**${result.totalPrice.toLocaleString()}** coins${discount ? ' (Daily Deal)' : ''}`,
        inline: true
      },
      {
        name: '👛 Remaining Wallet',
        value: `**${result.user.wallet.toLocaleString()}** coins`,
        inline: true
      }
    );
}

if (unlocked.length) {
  const achievementManager = require('../../systems/economy/achievementManager');
  embed.addFields({
    name: '🏅 Achievements Unlocked',
    value: unlocked
      .map(id => {
        const achievement = achievementManager.ACHIEVEMENTS[id];
        return achievement ? `${achievement.emoji} ${achievement.name}` : `🏅 ${id}`;
      })
      .join('\n'),
    inline: false
  });
}

await interaction.editReply({
  embeds: [embed]
});
}
};
