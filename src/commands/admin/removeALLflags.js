const {
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");

const User = require("../../database/schemas/User");

const OWNER_ID = process.env.OWNER_ID;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("removeallflags")
    .setDescription("Removes all flags from every user in this server"),

  async execute(interaction) {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({
        content: "❌ This command is restricted to the bot owner only.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const result = await User.updateMany(
        { guildId: interaction.guild.id },
        { $set: { flags: 0 } }
      );

      const embed = new EmbedBuilder()
        .setColor(0x00d26a)
        .setAuthor({
          name: "Flag Reset Complete",
          iconURL: interaction.client.user.displayAvatarURL(),
        })
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setDescription(
          "All user flags for this server have been successfully cleared."
        )
        .addFields(
          {
            name: "🧹 Users Reset",
            value: `**${result.modifiedCount.toLocaleString()}**`,
            inline: true,
          },
          {
            name: "🏠 Server",
            value: `${interaction.guild.name}`,
            inline: true,
          },
          {
            name: "👤 Executed By",
            value: `${interaction.user}`,
            inline: true,
          }
        )
        .setFooter({
          text: `Guild ID: ${interaction.guild.id}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      return interaction.editReply({
        embeds: [embed],
      });

    } catch (err) {
      console.error(err);

      const errorEmbed = new EmbedBuilder()
        .setColor(0xff3b3b)
        .setAuthor({
          name: "Flag Reset Failed",
          iconURL: interaction.client.user.displayAvatarURL(),
        })
        .setDescription(
          "An unexpected error occurred while attempting to reset all user flags."
        )
        .addFields({
          name: "⚠️ Status",
          value: "Database operation failed.",
        })
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      return interaction.editReply({
        embeds: [errorEmbed],
      });
    }
  },
};