const helpCommand = require('../../commands/utility/help');

module.exports = {
  name: 'interactionCreate',

  async execute(interaction) {
    if (!interaction.isStringSelectMenu()) return;

    if (interaction.customId === 'help_menu') {
      const category = interaction.values[0];

      return interaction.update({
        embeds: [helpCommand.buildHelpEmbed(interaction.client, category)],
        components: [helpCommand.buildHelpMenu(interaction.client)]
      });
    }
  }
};