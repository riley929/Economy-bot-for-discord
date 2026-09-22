const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../../systems/economy/economyManager');
const { xpNeeded, getLevelReward, progressBar } = require('../../systems/economy/levelManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('View your level and XP')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to view')
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    const target = interaction.options.getUser('user') || interaction.user;
    const user = await economy.getUser(target.id, interaction.guild.id);

    const needed = xpNeeded(user.level || 1);
    const bar = progressBar(user.xp || 0, needed);

    const embed = new EmbedBuilder()
      .setColor('#9b5cff')
      .setTitle(`⭐ ${target.username}'s Level`)
      .setDescription(
        `Level: **${user.level || 1}**\n` +
        `XP: **${(user.xp || 0).toLocaleString()} / ${needed.toLocaleString()}**\n` +
        `${bar}\n\n` +
        `Next level reward: **${getLevelReward((user.level || 1) + 1).toLocaleString()} coins**`
      );

    await interaction.editReply({ embeds: [embed] });
  }
};