module.exports = {
  name: 'interactionCreate',

  async execute(interaction) {
    if (!interaction.isModalSubmit()) return;

    // No modal systems are active yet.
    // This file exists for future modal support.
  }
};