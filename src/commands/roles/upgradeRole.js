const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('upgraderole')
    .setDescription('Upgrade role tiers — coming soon'),

  async execute(interaction) {
    await interaction.reply({
      content: '🚧 Role upgrades are not configured yet. This command is reserved for future VIP tier upgrades.',
      ephemeral: true
    });
  }
};