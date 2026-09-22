const { SlashCommandBuilder } = require('discord.js');
const shopManager = require('../../systems/shop/shopManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removerole')
    .setDescription('Remove a role you bought')
    .addStringOption(option =>
      option
        .setName('role')
        .setDescription('Role item ID')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const roleItemId = interaction.options.getString('role');
    const item = shopManager.getItemById(roleItemId);

    if (!item || item.type !== 'role') {
      return interaction.editReply('❌ That role item does not exist.');
    }

    if (!item.roleId) {
      return interaction.editReply('❌ This role item has no Discord role ID.');
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (!member.roles.cache.has(item.roleId)) {
      return interaction.editReply('❌ You do not currently have that role.');
    }

    await member.roles.remove(item.roleId);

    await interaction.editReply(`✅ Removed **${item.name}** from you.`);
  }
};