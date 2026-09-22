const { SlashCommandBuilder } = require('discord.js');
const economy = require('../../systems/economy/economyManager');
const { isOwner } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('additem')
    .setDescription('Give an item to a user')
    .addUserOption(opt =>
      opt
        .setName('user')
        .setDescription('User to give the item to')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('item')
        .setDescription('Item ID to give')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt
        .setName('amount')
        .setDescription('Amount of the item to give')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!isOwner(interaction.user.id)) {
      return interaction.editReply('❌ No.');
    }

    const target = interaction.options.getUser('user');
    const itemId = interaction.options.getString('item');
    const amount = interaction.options.getInteger('amount');

    const user = await economy.getUser(target.id, interaction.guild.id);

    const existing = user.inventory.find(i => i.itemId === itemId || i.id === itemId);

    if (existing) {
      existing.quantity = (existing.quantity || existing.amount || 0) + amount;
    } else {
      user.inventory.push({
        itemId,
        name: itemId,
        type: 'admin',
        quantity: amount,
        boughtAt: new Date()
      });
    }

    await user.save();

    await interaction.editReply(`📦 Gave **${amount}x ${itemId}** to ${target.tag}`);
  }
};