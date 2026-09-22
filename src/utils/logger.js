const { EmbedBuilder } = require('discord.js');
const { LOG_CHANNEL_ID } = require('../config/config');

async function sendLog(interaction, options = {}) {
  const channel = interaction.guild?.channels.cache.get(LOG_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(options.color || '#2b2d31')
    .setTitle(options.title || '📋 Log')
    .setTimestamp();

  if (options.description) {
    embed.setDescription(options.description);
  }

  embed.addFields(
    { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
    { name: 'User ID', value: interaction.user.id, inline: true }
  );

  if (options.fields?.length) {
    embed.addFields(options.fields);
  }

  await channel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { sendLog };