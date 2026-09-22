const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),

  async execute(interaction) {
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });

    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const api = Math.round(interaction.client.ws.ping);

    const embed = new EmbedBuilder()
      .setColor('#5865f2')
      .setTitle('🏓 Pong!')
      .setDescription(
        `Bot Latency: **${latency}ms**\n` +
        `API Latency: **${api}ms**`
      );

    await interaction.editReply({ content: null, embeds: [embed] });
  }
};