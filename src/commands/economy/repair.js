const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../../systems/economy/economyManager');
const { checkRate } = require('../../systems/antiAbuse/rateLimiter');
const { flag } = require('../../systems/antiAbuse/exploitDetector');

const COOLDOWN = 8 * 60 * 1000;
const MIN_REWARD = 450;
const MAX_REWARD = 1700;

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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('repair')
    .setDescription('Repair equipment for a service fee'),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    if (!checkRate(interaction.user.id, 'repair', 3, 5000)) {
      await flag(interaction.user.id, interaction.guild.id, 'Rate limit hit on repair');

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ed4245')
            .setTitle('⚠️ Slow Down')
            .setDescription('Your workshop is too busy. Give it a moment.')
            .setTimestamp()
        ]
      });
    }

    const user = await economy.getUser(interaction.user.id, interaction.guild.id);
    const last = user.cooldowns.repair ? user.cooldowns.repair.getTime() : 0;
    const now = Date.now();
    const remaining = COOLDOWN - (now - last);

    if (remaining > 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#fee75c')
            .setTitle('🛠️ Repair Cooldown')
            .setDescription(`Your shop can accept a new repair in **${formatTime(remaining)}**.`)
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp()
        ]
      });
    }

    user.cooldowns.repair = new Date();
    const success = Math.random() < 0.55;
    const reward = randomInt(MIN_REWARD, MAX_REWARD);

    if (!success) {
      await user.save();

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#ed4245')
            .setTitle('🛠️ Repair Failed')
            .setDescription('The repair did not go well and the client left unhappy.')
            .addFields(
              { name: '💸 Wallet', value: `**${user.wallet.toLocaleString()}** coins`, inline: true },
              { name: '⏰ Cooldown', value: '**8 minutes**', inline: true }
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

    user.wallet += reward;
    user.lifetimeEarned = (user.lifetimeEarned || 0) + reward;
    await user.save();

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor('#57f287')
          .setTitle('🛠️ Repair Complete')
          .setDescription(`You repaired the equipment and earned **${reward.toLocaleString()} coins**.`)
          .addFields(
            { name: '💰 Payment', value: `**${reward.toLocaleString()}** coins`, inline: true },
            { name: '💸 Wallet', value: `**${user.wallet.toLocaleString()}** coins`, inline: true },
            { name: '⏰ Cooldown', value: '**8 minutes**', inline: true }
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
