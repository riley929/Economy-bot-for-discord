const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../../systems/economy/economyManager");

const COOLDOWN = 5 * 60 * 1000;

const ANIMALS = [
  { key: "rabbit", name: "Rabbit", chance: 75, emoji: "🐇" },
  { key: "deer", name: "Deer", chance: 60, emoji: "🦌" },
  { key: "fox", name: "Fox", chance: 50, emoji: "🦊" },
  { key: "wolf", name: "Wolf", chance: 30, emoji: "🐺" },
  { key: "bear", name: "Bear", chance: 15, emoji: "🐻" },
  { key: "tiger", name: "Tiger", chance: 8, emoji: "🐯" },
  { key: "squirrel", name: "Squirrel", chance: 80, emoji: "🐿️" },
  { key: "boar", name: "Boar", chance: 50, emoji: "🐗" },
  { key: "moose", name: "Moose", chance: 10, emoji: "🦌" },
  { key: "elk", name: "Elk", chance: 22, emoji: "🦌" },
  { key: "bison", name: "Bison", chance: 12, emoji: "🦬" },
  { key: "lynx", name: "Lynx", chance: 18, emoji: "🐆" },
  { key: "panther", name: "Panther", chance: 6, emoji: "🐆" },
  { key: "cougar", name: "Cougar", chance: 14, emoji: "🐅" },
  { key: "badger", name: "Badger", chance: 48, emoji: "🦡" },
  { key: "bobcat", name: "Bobcat", chance: 40, emoji: "🐱" },
  { key: "mongoose", name: "Mongoose", chance: 55, emoji: "🦝" },
  { key: "hyena", name: "Hyena", chance: 9, emoji: "🦛" },
  { key: "jackal", name: "Jackal", chance: 30, emoji: "🦊" },
  { key: "warthog", name: "Warthog", chance: 28, emoji: "🐗" },
  { key: "armadillo", name: "Armadillo", chance: 45, emoji: "🦔" },
  { key: "tapir", name: "Tapir", chance: 16, emoji: "🐃" },
  { key: "antelope", name: "Antelope", chance: 26, emoji: "🦌" },
  { key: "gazelle", name: "Gazelle", chance: 34, emoji: "🦌" },
  { key: "lemur", name: "Lemur", chance: 38, emoji: "🐒" },
  { key: "pangolin", name: "Pangolin", chance: 4, emoji: "🦎" },
  { key: "otter", name: "Otter", chance: 35, emoji: "🦦" },
  { key: "raccoon", name: "Raccoon", chance: 42, emoji: "🦝" },
  { key: "camel", name: "Camel", chance: 20, emoji: "🐪" },
  { key: "wildhorse", name: "Wild Horse", chance: 18, emoji: "🐴" },
  { key: "serval", name: "Serval", chance: 16, emoji: "🐈" },
  { key: "wolverine", name: "Wolverine", chance: 12, emoji: "🐾" },
  { key: "coyote", name: "Coyote", chance: 24, emoji: "🦊" },
  { key: "meerkat", name: "Meerkat", chance: 28, emoji: "🐾" },
  { key: "cheetah", name: "Cheetah", chance: 10, emoji: "🐆" },
  { key: "hippopotamus", name: "Hippopotamus", chance: 8, emoji: "🦛" }
];

function getRarity(animal) {
  const chance = animal?.chance ?? 0;
  if (chance >= 75) return "Common";
  if (chance >= 50) return "Uncommon";
  if (chance >= 25) return "Rare";
  if (chance >= 10) return "Epic";
  return "Legendary";
}

function formatTime(ms) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

function makeCooldownEmbed(left, interaction) {
  return new EmbedBuilder()
    .setColor("#f9a602")
    .setTitle("🏹 Hunting Cooldown")
    .setDescription(`Your next hunt is available in **${formatTime(left)}**`)
    .setAuthor({
      name: interaction.user.tag,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true })
    })
    .addFields(
      { name: "Patience", value: "Sharpen your arrows and sneak back soon.", inline: false },
      { name: "Status", value: `Cooldown remaining: **${formatTime(left)}**`, inline: true }
    )
    .setFooter({ text: "Hunt command" })
    .setTimestamp();
}

function makeSuccessEmbed(animal, interaction) {
  return new EmbedBuilder()
    .setColor("#57f287")
    .setTitle(`${animal.emoji} Hunt Complete`)
    .setDescription(`You tracked down and caught a **${animal.name}**!`)
    .setAuthor({
      name: interaction.user.tag,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true })
    })
    .addFields(
      { name: "Prey", value: `${animal.emoji} **${animal.name}**`, inline: true },
      { name: "Catch Chance", value: `${animal.chance}%`, inline: true },
      { name: "Rarity", value: getRarity(animal), inline: true },
      { name: "Reward", value: "Your trophy has been added to your inventory.", inline: false }
    )
    .setFooter({ text: "Stay sharp for the next hunt" })
    .setTimestamp();
}

function makeFailureEmbed(interaction) {
  return new EmbedBuilder()
    .setColor("#ed4245")
    .setTitle("🌲 Hunt Failed")
    .setDescription("The animal sensed you and slipped away into the forest.")
    .setAuthor({
      name: interaction.user.tag,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true })
    })
    .addFields({ name: "Tip", value: "Try again with better timing and stealth.", inline: false })
    .setFooter({ text: "Don't give up yet" })
    .setTimestamp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("hunt")
    .setDescription("Go hunting"),

  async execute(interaction) {
    await interaction.deferReply();

    const user = await economy.getUser(interaction.user.id, interaction.guild.id);
    const last = user.cooldowns.hunt ? user.cooldowns.hunt.getTime() : 0;
    const now = Date.now();

    if (now - last < COOLDOWN) {
      const endTime = last + COOLDOWN;
      const msg = await interaction.editReply({ embeds: [makeCooldownEmbed(endTime - now, interaction)] });

      const interval = setInterval(() => {
        const left = endTime - Date.now();

        if (left <= 0) {
          clearInterval(interval);
          return msg.edit({
            embeds: [
              new EmbedBuilder()
                .setColor("#57f287")
                .setTitle("🏹 Ready to Hunt")
                .setDescription("Your cooldown has expired. Go hunt again!")
                .setAuthor({
                  name: interaction.user.tag,
                  iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setFooter({ text: "Hunt command" })
                .setTimestamp()
            ]
          }).catch(() => {});
        }

        msg.edit({ embeds: [makeCooldownEmbed(left, interaction)] }).catch(() => clearInterval(interval));
      }, 5000);

      return;
    }

    user.cooldowns.hunt = new Date();
    let idx = Math.floor(Math.random() * ANIMALS.length);
    let animal = ANIMALS[idx];

    // apply hunting gear upgrades
    const gearLevel = (user.upgrades && user.upgrades.huntingGear) || 0;
    const chanceBonus = gearLevel * 4; // +4% per level
    const effectiveChance = Math.max(2, Math.min(100, animal.chance + chanceBonus));
    const extraQty = Math.floor(gearLevel / 3);

    // extra luck promotion (one-time upgrade)
    const hasExtraLuck = (user.upgrades && user.upgrades.extraLuck) ? 1 : 0;
    const promotionChance = hasExtraLuck ? 10 : 0;

    const roll = Math.random() * 100;

    if (roll <= effectiveChance) {
      if (hasExtraLuck && Math.random() * 100 <= promotionChance) {
        idx = Math.min(ANIMALS.length - 1, idx + 1);
        animal = ANIMALS[idx];
      }

      const qty = Math.min(5, 1 + extraQty);
      const current = user.items.get(animal.key) || 0;
      user.items.set(animal.key, current + qty);
      await user.save();

      const embed = makeSuccessEmbed(animal, interaction)
        .setDescription(`You tracked down and caught **${qty}x ${animal.name}**!`)
        .spliceFields(1, 1, { name: "Catch Chance", value: `${effectiveChance}%`, inline: true })
        .addFields({ name: '🍀 Extra Luck', value: `${promotionChance}% chance to upgrade catch`, inline: true });

      return interaction.editReply({ embeds: [embed] });
    }

    await user.save();
    return interaction.editReply({ embeds: [makeFailureEmbed(interaction)] });
  }
};