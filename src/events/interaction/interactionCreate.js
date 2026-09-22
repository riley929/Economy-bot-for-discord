const {EmbedBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle} = require('discord.js');
const User = require('../../database/schemas/User');
const { enqueue, getQueueSize } = require('../../systems/core/commandQueue');
const { checkRate } = require('../../systems/antiAbuse/rateLimiter');
const { flag } = require('../../systems/antiAbuse/exploitDetector');
const { addXP } = require('../../systems/economy/xpManager');
const { panicGuard } = require('../../utils/panicGuard');

const VERIFY_BUTTON_ID = 'bot_rules_verify_accept';
const ALLOWED_CHANNEL = "1391920807810170941";

const PRIVATE_COMMANDS = [
  'blacklist',
  'unblacklist',
  'viewflags',
  'runjob',
  'ownermoney',
  'removemoney',
  'setbalance',
  'resetuser',
  'additem',
  'removeitem',
  'claim',
  'orderqueue'
];

function restrictChannelEmbed(channelId) {
  return new EmbedBuilder()
    .setColor('#ed4245')
    .setTitle('🚫 Wrong Channel')
    .setDescription(
      `You can only use <@${client.user.id}> in <#${channelId}>.\n` +
      `Please switch channels and try again.`
    )
    .addFields({
      name: '📍 Allowed Channel',
      value: `<#${channelId}>`,
      inline: false
    })
    .setTimestamp();
}

function rulesEmbed(guildName) {
  return new EmbedBuilder()
    .setColor('#fee75c')
    .setTitle('📜 Rules Required')
    .setDescription(
`Before you can use **${guildName}**, you must read and accept the bot rules.\n\n` +

`## 📜 Bot Rules\n` +
`> **1.** Do not exploit bugs, glitches, unintended mechanics, or command loopholes.\n` +
`> **2.** Do not use alternate accounts or another person's account to gain an unfair advantage.\n` +
`> **3.** Do not farm money, items, XP, rewards, streaks, cooldowns, or achievements using multiple accounts or other users.\n` +
`> **4.** Do not intentionally manipulate the economy, gambling, shop, trading, loans, orders, giveaways, or any other bot system.\n` +
`> **5.** Do not use macros, auto-clickers, scripts, self-bots, or automation to interact with the bot.\n` +
`> **6.** Do not spam commands or intentionally overload the bot.\n` +
`> **7.** If you discover a bug or exploit, report it instead of abusing or sharing it.\n` +
`> **8.** Do not encourage, assist, or teach others how to exploit bugs or abuse the bot.\n` +
`> **9.** Do not evade blacklists, punishments, or restrictions by using alternate or shared accounts.\n` +
`> **10.** Do not attempt to deceive staff or hide evidence during exploit investigations.\n` +
`> **11.** Any accounts involved in abuse may receive warnings, money wipes, inventory wipes, balance resets, temporary blacklists, permanent blacklists, or other penalties.\n` +
`> **12.** Punishments may apply to all accounts associated with abuse, including alternate or shared accounts.\n` +
`> **13.** Owner and staff decisions regarding exploits, abuse, investigations, and punishments are final.\n\n` +

`⚠️ These rules are not exhaustive. Any attempt to gain an unfair advantage or intentionally abuse the bot may still result in punishment, even if it is not specifically listed above.\n\n` +

`Click **Verify** below to agree to these rules and unlock access to the bot.`
    )
    .setFooter({ text: 'You only need to verify once.' })
    .setTimestamp();
}

function rulesButtons(userId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`verify_${userId}`)
        .setLabel('Verify')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success)
    )
  ];
}

async function getOrCreateUser(userId, guildId) {
  let user = await User.findOne({ userId, guildId });

  if (!user) {
    user = await User.create({
      userId,
      guildId
    });
  }

  return user;
}

module.exports = {
  name: 'interactionCreate',

  async execute(interaction, client) {
    // =========================
    // ✅ VERIFY BUTTON HANDLER
    // =========================
    if (
      interaction.isButton() &&
      interaction.customId.startsWith('verify_')
    ) {
      if (!interaction.guild) {
        return interaction.reply({
          content: '❌ This can only be used in a server.',
          ephemeral: true
        });
      }

      const ownerId = interaction.customId.split('_')[1];

      // Prevent other users from verifying with someone else's button
      if (interaction.user.id !== ownerId) {
        return interaction.reply({
          content: "❌ This verification button isn't for you.",
          ephemeral: true
        });
      }

      await interaction.deferUpdate().catch(() => {});

      const userData = await getOrCreateUser(
        interaction.user.id,
        interaction.guild.id
      );

      userData.verified = true;
      userData.verifiedAt = new Date();

      await userData.save();

      const embed = new EmbedBuilder()
        .setColor('#57f287')
        .setTitle('✅ Verified')
        .setDescription(
          `You accepted the rules.\n\n` +
          `You can now use the bot. Run your command again.`
        )
        .setTimestamp();

      return interaction.editReply({
        embeds: [embed],
        components: []
      }).catch(() => {});
    }

    if (interaction.isChatInputCommand()) {

      if (interaction.channelId !== ALLOWED_CHANNEL) {

        if (!interaction.deferred && !interaction.replied) {
          return interaction.reply({
            embeds: [restrictChannelEmbed(ALLOWED_CHANNEL)],
            ephemeral: false
          }).catch(() => {});
        }

        return interaction.editReply({
          embeds: [restrictChannelEmbed(ALLOWED_CHANNEL)],
          components: [],
          content: null
        }).catch(() => {});
      }
    }

  



    // =========================
    // ✅ SLASH COMMAND HANDLER
    // =========================
    if (!interaction.isChatInputCommand()) return;

    if (!interaction.guild) {
      return interaction.reply({
        content: '❌ Commands can only be used in a server.',
        ephemeral: true
      }).catch(() => {});
    }

   

    const command = client.commands.get(interaction.commandName);
if (!command) return;

const panic = await panicGuard(interaction, command);
console.log('PANIC TEST', {
  command: interaction.commandName,
  category: command.category,
  filePath: command.filePath
});

if (panic.blocked) {
  return interaction.reply({
    embeds: [panic.embed],
    ephemeral: false
  }).catch(() => {});
}

    let userData = await getOrCreateUser(
      interaction.user.id,
      interaction.guild.id
    );

    // temp blacklist expiry check
    if (userData?.blacklisted) {
      if (userData.blacklistExpiresAt && userData.blacklistExpiresAt < new Date()) {
        userData.blacklisted = false;
        userData.flags = 0;
        userData.blacklistExpiresAt = null;
        userData.blacklistReason = null;
        await userData.save();
      }
    }

    const isPrivateCommand = PRIVATE_COMMANDS.includes(interaction.commandName);
    const needsVerify = !userData.verified;
    const ephemeral = isPrivateCommand;

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral }).catch(() => {});
    }

    const originalReply = interaction.reply.bind(interaction);
    const originalDeferReply = interaction.deferReply.bind(interaction);

    interaction.deferReply = async (...args) => {
      if (interaction.deferred || interaction.replied) return;
      return originalDeferReply(...args);
    };


    interaction.reply = async (options) => {
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply(options);
      }

      return originalReply(options);
    };

    // =========================
    // 🚫 BLACKLIST CHECK
    // =========================
    if (userData?.blacklisted) {
      const blacklistEmbed = new EmbedBuilder()
        .setColor('#ed4245')
        .setTitle('🚫 Temporarily Blacklisted')
        .setDescription(
          `You cannot use the bot right now.\n\n` +
          `**Reason:** ${userData.blacklistReason || 'N/A'}\n` +
          (
            userData.blacklistExpiresAt
              ? `**Expires:** <t:${Math.floor(userData.blacklistExpiresAt.getTime() / 1000)}:R>`
              : ''
          )
        );

      return interaction.editReply({
        embeds: [blacklistEmbed],
        components: []
      }).catch(() => {});
    }

    // =========================
    // 📜 GLOBAL VERIFY CHECK
    // =========================
    if (!userData.verified) {
      return interaction.editReply({
        embeds: [rulesEmbed(interaction.guild.name)],
        components: rulesButtons(interaction.user.id)
      }).catch(() => {});
    }

    const position = getQueueSize() + 1;

    if (position > 1 && !ephemeral) {
      await interaction.editReply({
        content: `⏳ Your command is queued. Position: **#${position}**`,
        embeds: [],
        components: []
      }).catch(() => {});
    }

    const spamProtected = ['beg', 'work', 'crime'];

    if (spamProtected.includes(interaction.commandName)) {
      if (!checkRate(interaction.user.id, interaction.commandName, 3, 10_000)) {
        await flag(
          interaction.user.id,
          interaction.guild.id,
          `Spam detected on /${interaction.commandName}`
        );

        const rateEmbed = new EmbedBuilder()
          .setColor('#ed4245')
          .setTitle('⚠️ Slow Down')
          .setDescription(
            `You are using **/${interaction.commandName}** too fast. Chill for a second.`
          );

        return interaction.editReply({
          embeds: [rateEmbed],
          components: []
        }).catch(() => {});
      }
    }

    enqueue(async () => {
      try {
        // ✅ Give XP
        const xp = await addXP({
          userId: interaction.user.id,
          guildId: interaction.guild.id
        });

        // ✅ Run command
        await command.execute(interaction, client);

        // 🎉 Level up message
        if (xp?.leveledUp) {
          await interaction.followUp({
            content: `🎉 You leveled up! You are now **Level ${xp.level}**`,
            ephemeral: true
          }).catch(() => {});
        }
      } catch (err) {
        console.error(`❌ Command error in /${interaction.commandName}:`, err);

        await interaction.editReply({
          content: '❌ Something went wrong while running this command.',
          embeds: [],
          components: []
        }).catch(() => {});
      }
    });
  }
};