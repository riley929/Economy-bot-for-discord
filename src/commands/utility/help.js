const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require('discord.js');

const categoryNames = {
  economy: '💰 Economy',
  progression: '📈 Progression',
  gambling: '🎰 Gambling',
  shop: '🛒 Shop',
  roles: '🏷️ Roles',
  external: '🎮 External Orders',
  admin: '🛡️ Admin',
  utility: '⚙️ Utility'
};

const helpCategoryOverrides = new Map([
  ['achievements', 'progression'],
  ['profile', 'progression'],
  ['level', 'progression'],
  ['leaderboard', 'progression'],
  ['xpleaderboard', 'progression'],
  ['claimpurchase', 'progression']
]);

function getGroupedCommands(client) {
  const grouped = {};

  for (const command of client.commands.values()) {
    const overrideCategory = helpCategoryOverrides.get(command.data.name);
    const category = overrideCategory || command.category || 'utility';
    if (category === 'admin') continue;

    if (!grouped[category]) grouped[category] = [];

    grouped[category].push({
      name: command.data.name,
      description: command.data.description || 'No description'
    });
  }

  for (const category of Object.keys(grouped)) {
    grouped[category].sort((a, b) => a.name.localeCompare(b.name));
  }

  return grouped;
}

function buildHelpEmbed(client, category = 'main') {
  const grouped = getGroupedCommands(client);

  const embed = new EmbedBuilder()
    .setColor('#ffd700')
    .setTimestamp();

  if (category === 'main') {
    const lines = Object.keys(grouped).map(cat => {
      const label = categoryNames[cat] || cat;
      return `${label} — **${grouped[cat].length} command(s)**`;
    });

    return embed
      .setTitle('📜 Eco Bot Help')
      .setDescription(
        `Select a category below to view commands.\n\n${lines.join('\n')}`
      );
  }

  const commands = grouped[category] || [];

  if (!commands.length) {
    return embed
      .setTitle(categoryNames[category] || category)
      .setDescription('No commands found in this category.');
  }

  return embed
    .setTitle(categoryNames[category] || category)
    .setDescription(
      commands
        .map(command => `/${command.name} — ${command.description}`)
        .join('\n')
    );
}

function buildHelpMenu(client) {
  const grouped = getGroupedCommands(client);

  const options = Object.keys(grouped).map(category => ({
    label: (categoryNames[category] || category).replace(/^[^\w]+ /, ''),
    description: `${grouped[category].length} command(s)`,
    value: category,
    emoji: (categoryNames[category] || '📁').split(' ')[0]
  }));

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('help_menu')
      .setPlaceholder('Choose a command category')
      .addOptions(options.slice(0, 25))
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Open the automatic help menu'),

  async execute(interaction) {
    await interaction.reply({
      embeds: [buildHelpEmbed(interaction.client, 'main')],
      components: [buildHelpMenu(interaction.client)]
    });
  },

  buildHelpEmbed,
  buildHelpMenu
};