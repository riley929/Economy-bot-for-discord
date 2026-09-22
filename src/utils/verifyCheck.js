const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

function verifyEmbed(guildName) {
  return new EmbedBuilder()
    .setColor('#fee75c')
    .setTitle('📜 Rules Required')
    .setDescription(
      `Before you can use **${guildName}**, you need to read and accept the rules.\n\n` +

      `**Server / Bot Rules**\n` +
      `> 1. Do not exploit bugs, glitches, or command loopholes.\n` +
      `> 2. Do not use alts to farm rewards, money, cooldowns, or wins.\n` +
      `> 3. Do not spam commands or try to bypass cooldowns.\n` +
      `> 4. Do not abuse gambling, economy, shop, or order systems.\n` +
      `> 5. If you find a bug, report it instead of abusing it.\n` +
      `> 6. Staff/owner decisions on abuse are final.\n\n` +

      `Click **Verify** to agree and unlock the bot.`
    )
    .setFooter({ text: 'You only need to verify once.' })
    .setTimestamp();
}

function verifyButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('bot_verify_accept')
        .setLabel('Verify')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success)
    )
  ];
}

module.exports = {
  verifyEmbed,
  verifyButtons
};