const Guild = require('../database/schemas/Guild');

async function panicGuard(interaction, command) {
  if (!interaction?.guild || !command) {
    return { blocked: false };
  }

  const guild = await Guild.findOne({
    guildId: interaction.guild.id
  });

  if (!guild?.panicMode) {
    return { blocked: false };
  }

  const blockedCategories = ['economy', 'gambling'];

  if (blockedCategories.includes(command.category)) {
    return {
      blocked: true,
      embed: {
        title: '🚨 Panic Lock Active',
        description:
          `**Economy & Gambling are currently disabled.**\n\n` +
          `The server owner has temporarily restricted these systems.\n` +
          `Please try again later.`,
        color: 0xed4245
      }
    };
  }

  return { blocked: false };
}

module.exports = { panicGuard };