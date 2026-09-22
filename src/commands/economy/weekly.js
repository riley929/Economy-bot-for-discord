const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../../systems/economy/economyManager');
const { checkRate } = require('../../systems/antiAbuse/rateLimiter');
const { flag } = require('../../systems/antiAbuse/exploitDetector');

const COOLDOWN = 7 * 24 * 60 * 60 * 1000;
const REWARD = 7500;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weekly')
    .setDescription('Claim your weekly reward'),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    if (!checkRate(interaction.user.id, 'weekly', 4, 10_000)) {
      await flag(interaction.user.id, interaction.guild.id, 'Rate limit hit on weekly');

      const rateEmbed = new EmbedBuilder()
        .setColor('#ed4245')
        .setTitle('⚠️ Slow Down')
        .setDescription('You are using `/weekly` too fast. Chill for a second.');

      return interaction.editReply({ embeds: [rateEmbed] });
    }

    const user = await economy.getUser(interaction.user.id, interaction.guild.id);

    const last = user.cooldowns.weekly ? user.cooldowns.weekly.getTime() : 0;
    const remaining = COOLDOWN - (Date.now() - last);

    if (remaining > 0) {
      const days = Math.floor(remaining / 86400000);
      const hours = Math.ceil((remaining % 86400000) / 3600000);

     const cooldownEmbed = new EmbedBuilder()
  .setColor("#fee75c")
  .setTitle("📅 Weekly Cooldown")
  .setDescription(
    `You've already claimed this week's reward.\n\n` +
    `⏰ Time Remaining: **${days}d ${hours}h**`
  )
  .setAuthor({
    name: interaction.user.tag,
    iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
  })
  .addFields({
    name: "Try Again",
    value: "Come back next week for another payout.",
    inline: false,
  })
  .setFooter({
    text: "The wait is worth it",
  })
  .setTimestamp();

      return interaction.editReply({ embeds: [cooldownEmbed] });
    }

    user.wallet += REWARD;
    user.cooldowns.weekly = new Date();
    await user.save();
const embed = new EmbedBuilder()
  .setColor("#5865f2")
  .setTitle("📅 Weekly Reward Claimed")
  .setDescription(
    `You claimed your weekly reward and received **${REWARD.toLocaleString()} coins**.`
  )
  .setAuthor({
    name: interaction.user.tag,
    iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
  })
  .addFields(
    {
      name: "🎁 Weekly Reward",
      value: `**${REWARD.toLocaleString()}** coins`,
      inline: true,
    },
    {
      name: "💸 Wallet",
      value: `**${user.wallet.toLocaleString()}** coins`,
      inline: true,
    },
    {
      name: "⏰ Next Weekly",
      value: "**7 days**",
      inline: true,
    }
  )
  .setFooter({
    text: "See you next week",
  })
  .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};