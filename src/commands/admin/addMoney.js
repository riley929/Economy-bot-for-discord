const {
  SlashCommandBuilder,
  EmbedBuilder
} = require('discord.js');

const economy = require('../../systems/economy/economyManager');
const { isOwner } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addmoney')
    .setDescription('Add money to a user')
    .addUserOption(opt =>
      opt
        .setName('user')
        .setDescription('User to give money to')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt
        .setName('amount')
        .setDescription('Amount of coins to add')
        .setRequired(true)
        .setMinValue(1)
    )
    .addStringOption(opt =>
      opt
        .setName('account')
        .setDescription('Where to add the money')
        .setRequired(true)
        .addChoices(
          { name: '💵 Wallet', value: 'wallet' },
          { name: '🏦 Bank', value: 'bank' }
        )
    ),

  async execute(interaction) {

    await interaction.deferReply();

    if (!isOwner(interaction.user.id)) {
      return interaction.editReply({
        content: '❌ You do not have permission to use this command.'
      });
    }

    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const account = interaction.options.getString('account');

    const user = await economy.getUser(target.id, interaction.guild.id);

    if (account === 'wallet') {
      user.wallet += amount;
    } else {
      user.bank += amount;
    }

    await user.save();

    const embed = new EmbedBuilder()
      .setColor('#00D26A')
      .setAuthor({
        name: 'Economy Manager',
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setTitle('💸 Money Added')
      .setDescription(
        `Successfully credited **🪙 ${amount.toLocaleString()}** to ${target}'s **${account.charAt(0).toUpperCase() + account.slice(1)}**.`
      )
      .addFields(
        {
          name: '👤 Recipient',
          value: `${target.tag}\n\`${target.id}\``,
          inline: true,
        },
        {
          name: '🏦 Account',
          value: account === 'wallet' ? '💵 Wallet' : '🏦 Bank',
          inline: true,
        },
        {
          name: '💰 Amount',
          value: `🪙 **${amount.toLocaleString()} Coins**`,
          inline: true,
        },
        {
          name: '🛠 Executed By',
          value: `${interaction.user}`,
          inline: true,
        }
      )
      .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 512 }))
      .setFooter({
        text: interaction.guild.name,
        iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined,
      })
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed],
    });
  },
};