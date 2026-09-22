const { SlashCommandBuilder } = require('discord.js');
const User = require('../../database/schemas/User');

const OWNER_ID = '1364717311386325043';

function parseDuration(duration) {
  if (!duration) return null;

  const match = duration.match(/^(\d+)([smhdw])$/i);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000
  };

  return Date.now() + amount * multipliers[unit];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Owner only: blacklist a user from the bot')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to blacklist')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('duration')
        .setDescription('Example: 30m, 12h, 7d, 1w (leave empty for permanent)')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (interaction.user.id !== OWNER_ID) {
      return interaction.editReply('❌ You are not allowed to use this.');
    }

    const target = interaction.options.getUser('user');
    const duration = interaction.options.getString('duration');

    const expires = parseDuration(duration);

    if (duration && !expires) {
      return interaction.editReply(
        '❌ Invalid duration.\nExamples: `30m`, `12h`, `7d`, `1w`'
      );
    }

await User.findOneAndUpdate(
  {
    userId: target.id,
    guildId: interaction.guild.id
  },
  {
    blacklisted: true,
    blacklistExpiresAt: expires ? new Date(expires) : null
  },
  {
    upsert: true,
    new: true
  }
);

    let msg = `🚫 **${target.tag}** has been blacklisted`;

    if (expires) {
      msg += ` until <t:${Math.floor(expires / 1000)}:F>.`;
    } else {
      msg += ` permanently.`;
    }

    await interaction.editReply(msg);
  }
};