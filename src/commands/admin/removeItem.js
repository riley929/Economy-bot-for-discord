const { SlashCommandBuilder } = require('discord.js');
const economy = require('../../systems/economy/economyManager');
const { isOwner } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removeitem')
    .setDescription('Remove an item from a user')
    .addUserOption(opt =>
      opt
        .setName('user')
        .setDescription('User to remove the item from')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('item')
        .setDescription('Item ID to remove')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!isOwner(interaction.user.id)) {
      return interaction.editReply('❌ No.');
    }

    const target = interaction.options.getUser('user');
    const itemId = interaction.options.getString('item');

    const user = await economy.getUser(target.id, interaction.guild.id);

    user.inventory = user.inventory.filter(i =>
      i.itemId !== itemId && i.id !== itemId
    );

    await user.save();

    await interaction.editReply(`🗑️ Removed **${itemId}** from ${target.tag}`);
  }
};