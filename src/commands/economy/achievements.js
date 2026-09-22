const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../../systems/economy/economyManager');
const { ACHIEVEMENTS, formatAchievements } = require('../../systems/economy/achievementManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievements')
    .setDescription('View your unlocked achievements')
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
    const achievementList = formatAchievements(user);

    const description = achievementList.length
      ? achievementList.join('\n')
      : 'No achievements yet. Keep playing to unlock your first one!';

    const embed = new EmbedBuilder()
      .setColor('#ffd700')
      .setTitle(`🏅 ${target.username}'s Achievements`)
      .setDescription(description)
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
