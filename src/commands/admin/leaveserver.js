const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const OWNER_ID = '1364717311386325043';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaveserver')
    .setDescription('Force the bot to leave a server')
    .addStringOption(option =>
      option
        .setName('serverid')
        .setDescription('The server ID to leave')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // 🔒 OWNER ONLY
    if (interaction.user.id !== OWNER_ID) {
      return interaction.editReply('❌ You are not allowed to use this.');
    }

    const serverId = interaction.options.getString('serverid');

    const guild = interaction.client.guilds.cache.get(serverId);

    if (!guild) {
      return interaction.editReply(
        `❌ I am not in a server with ID \`${serverId}\`.`
      );
    }

    const guildName = guild.name;
    const memberCount = guild.memberCount;

    try {
      await guild.leave();

      const embed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('✅ Left Server')
        .addFields(
          { name: 'Server', value: guildName, inline: true },
          { name: 'Server ID', value: serverId, inline: true },
          { name: 'Members', value: `${memberCount}`, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed]
      });
    } catch (error) {
      console.error(error);

      const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('❌ Failed To Leave Server')
        .setDescription(
          `An error occurred while trying to leave **${guildName}**.`
        )
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed]
      });
    }
  }
};