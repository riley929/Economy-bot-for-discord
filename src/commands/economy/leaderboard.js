const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../database/schemas/User');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View richest users by net worth'),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    const users = await User.aggregate([
      {
        $match: {
          guildId: interaction.guild.id
        }
      },
      {
        $addFields: {
          netWorth: {
            $add: [
              { $ifNull: ['$wallet', 0] },
              { $ifNull: ['$bank', 0] }
            ]
          }
        }
      },
      {
        $sort: {
          netWorth: -1
        }
      },
      {
        $limit: 10
      }
    ]);

    const desc = users.map((u, i) => {
      const cash = Number(u.wallet || 0);
      const bank = Number(u.bank || 0);
      const netWorth = cash + bank;

      return [
        `**#${i + 1}** <@${u.userId}>`,
        `> 💵 Cash: **${cash.toLocaleString()}**`,
        `> 🏦 Bank: **${bank.toLocaleString()}**`,
        `> 💰 Net Worth: **${netWorth.toLocaleString()}**`
      ].join('\n');
    }).join('\n\n');

    const embed = new EmbedBuilder()
      .setColor('#ffd700')
      .setTitle('🏆 Richest Players')
      .setDescription(desc || 'No economy data found.')
      .setFooter({ text: 'Ranked by total net worth' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};