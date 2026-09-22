const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../../systems/economy/economyManager');
const { checkRate } = require('../../systems/antiAbuse/rateLimiter');
const { flag } = require('../../systems/antiAbuse/exploitDetector');

const COOLDOWN = 5 * 60 * 1000;
const MIN_REWARD = 250;
const MAX_REWARD = 1250;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function errorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor('#ed4245')
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('scavenge')
    .setDescription('Scavenge the area for coins and supplies'),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    if (!checkRate(interaction.user.id, 'scavenge', 4, 5000)) {
      await flag(interaction.user.id, interaction.guild.id, 'Rate limit hit on scavenge');

      return interaction.editReply({
        embeds: [
          errorEmbed(
            '⚠️ Slow Down',
            'You are searching too quickly. Take a moment and try again.'
          )
        ]
      });
    }

    const user = await economy.getUser(interaction.user.id, interaction.guild.id);
    const last = user.cooldowns.scavenge ? user.cooldowns.scavenge.getTime() : 0;
    const now = Date.now();
    const remaining = COOLDOWN - (now - last);

    if (remaining > 0) {
      const endTime = last + COOLDOWN;
      const timeLeft = Math.max(endTime - Date.now(), 0);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#fee75c')
            .setTitle('🧭 Scavenge Cooldown')
            .setDescription(
              `You have already scavenged recently. Come back in **${formatTime(timeLeft)}**.`
            )
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp()
        ]
      });
    }

    user.cooldowns.scavenge = new Date();
    const found = Math.random() < 0.65;

    if (!found) {
      await user.save();

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ed4245')
            .setTitle('🧹 Scavenge Found Nothing')
            .setDescription('The area was picked clean this time.')
            .addFields(
              { name: '💸 Wallet', value: `**${user.wallet.toLocaleString()}** coins`, inline: true },
              { name: '⏰ Cooldown', value: '**5 minutes**', inline: true }
            )
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp()
        ]
      });
    }

    const reward = randomInt(MIN_REWARD, MAX_REWARD);
    user.wallet += reward;
    user.lifetimeEarned = (user.lifetimeEarned || 0) + reward;
    await user.save();

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor('#57f287')
          .setTitle('🧭 Scavenge Success')
          .setDescription(`You found **${reward.toLocaleString()} coins** while scavenging.`)
          .addFields(
            { name: '💰 Reward', value: `**${reward.toLocaleString()}** coins`, inline: true },
            { name: '💸 Wallet', value: `**${user.wallet.toLocaleString()}** coins`, inline: true },
            { name: '⏰ Cooldown', value: '**5 minutes**', inline: true }
          )
          .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
          .setFooter({
            text: `Requested by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
          })
          .setTimestamp()
      ]
    });
  }
};
