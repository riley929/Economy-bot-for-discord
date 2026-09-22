const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const OWNER_ID = '1364717311386325043';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('servers')
    .setDescription('List all servers the bot is in'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // 🔒 OWNER ONLY
    if (interaction.user.id !== OWNER_ID) {
      return interaction.editReply('❌ You are not allowed to use this.');
    }

    const guilds = interaction.client.guilds.cache;

    if (!guilds.size) {
      return interaction.editReply('❌ Bot is not in any servers.');
    }

    let description = '';

    guilds.forEach((guild, index) => {
      description +=
        `**${index + 1}. ${guild.name}**\n` +
        `ID: \`${guild.id}\`\n` +
        `Members: ${guild.memberCount}\n\n`;
    });

    const chunks = [];

    while (description.length > 0) {
      chunks.push(description.slice(0, 4000));
      description = description.slice(4000);
    }

    for (let i = 0; i < chunks.length; i++) {
      const embed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle(`🌐 Bot Servers (${guilds.size})`)
        .setDescription(chunks[i])
        .setFooter({
          text: `Page ${i + 1}/${chunks.length}`
        });

      if (i === 0) {
        await interaction.editReply({
          embeds: [embed]
        });
      } else {
        await interaction.followUp({
          embeds: [embed],
          ephemeral: true
        });
      }
    }
  }
};