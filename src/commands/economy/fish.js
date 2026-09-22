const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../../systems/economy/economyManager");

const COOLDOWN = 5 * 60 * 1000;

const FISH = [
  { key: "fish", name: "Common Fish", chance: 70, emoji: "🐟" },
  { key: "salmon", name: "Salmon", chance: 55, emoji: "🐠" },
  { key: "tuna", name: "Tuna", chance: 40, emoji: "🐡" },
  { key: "cod", name: "Cod", chance: 60, emoji: "🐟" },
  { key: "trout", name: "Trout", chance: 50, emoji: "🐠" },
  { key: "bass", name: "Bass", chance: 45, emoji: "🐟" },
  { key: "shark", name: "Shark", chance: 15, emoji: "🦈" },
  { key: "dolphin", name: "Dolphin", chance: 10, emoji: "🐬" },
  { key: "whale", name: "Whale", chance: 5, emoji: "🐋" },
  { key: "sardine", name: "Sardine", chance: 72, emoji: "🐟" },
  { key: "mackerel", name: "Mackerel", chance: 65, emoji: "🐠" },
  { key: "anchovy", name: "Anchovy", chance: 68, emoji: "🐟" },
  { key: "catfish", name: "Catfish", chance: 60, emoji: "🐡" },
  { key: "gar", name: "Gar", chance: 55, emoji: "🐟" },
  { key: "pike", name: "Pike", chance: 48, emoji: "🐟" },
  { key: "eel", name: "Eel", chance: 40, emoji: "🐍" },
  { key: "ray", name: "Stingray", chance: 20, emoji: "🐠" },
  { key: "manta", name: "Manta Ray", chance: 12, emoji: "🪼" },
  { key: "marlin", name: "Marlin", chance: 8, emoji: "🐟" },
  { key: "swordfish", name: "Swordfish", chance: 6, emoji: "🐟" },
  { key: "lobster", name: "Lobster", chance: 9, emoji: "🦞" },
  { key: "crab", name: "Crab", chance: 30, emoji: "🦀" },
  { key: "octopus", name: "Octopus", chance: 14, emoji: "🐙" },
  { key: "jellyfish", name: "Jellyfish", chance: 25, emoji: "🌊" },
  { key: "seahorse", name: "Seahorse", chance: 35, emoji: "🐴" },
  { key: "sea_turtle", name: "Sea Turtle", chance: 7, emoji: "🐢" },
  { key: "koi", name: "Koi", chance: 22, emoji: "🐠" },
  { key: "carp", name: "Carp", chance: 50, emoji: "🐟" },
  { key: "anglerfish", name: "Anglerfish", chance: 3, emoji: "🐡" },
  { key: "tilapia", name: "Tilapia", chance: 62, emoji: "🐟" },
  { key: "pollock", name: "Pollock", chance: 58, emoji: "🐟" },
  { key: "halibut", name: "Halibut", chance: 18, emoji: "🐟" },
  { key: "pufferfish", name: "Pufferfish", chance: 16, emoji: "🐡" },
  { key: "sunfish", name: "Sunfish", chance: 28, emoji: "🐟" },
  { key: "barracuda", name: "Barracuda", chance: 11, emoji: "🐟" },
  { key: "goldfish", name: "Goldfish", chance: 40, emoji: "🐠" },
  { key: "rockfish", name: "Rockfish", chance: 35, emoji: "🐟" },
  { key: "bluefish", name: "Bluefish", chance: 32, emoji: "🐟" },
  { key: "sturgeon", name: "Sturgeon", chance: 7, emoji: "🐟" }
];

function getRarity(fish) {
  const chance = fish?.chance ?? 0;
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
    .setColor("#3498db")
    .setTitle("🎣 Fishing Cooldown")
    .setDescription(`Your line is still drying. Come back in **${formatTime(left)}**`)
    .setAuthor({
      name: interaction.user.tag,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true })
    })
    .addFields(
      { name: "Patience", value: "The water is quiet for now. Wait a little longer.", inline: false },
      { name: "Time Left", value: `**${formatTime(left)}**`, inline: true }
    )
    .setFooter({ text: "Fishing command" })
    .setTimestamp();
}

function makeSuccessEmbed(fish, interaction) {
  return new EmbedBuilder()
    .setColor("#57f287")
    .setTitle(`${fish.emoji} Fishing Success`)
    .setDescription(`You reeled in a **${fish.name}**!`)
    .setAuthor({
      name: interaction.user.tag,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true })
    })
    .addFields(
      { name: "Catch", value: `${fish.emoji} **${fish.name}**`, inline: true },
      { name: "Catch Chance", value: `${fish.chance}%`, inline: true },
      { name: "Rarity", value: getRarity(fish), inline: true },
      { name: "Result", value: "The fish has been added to your inventory.", inline: false }
    )
    .setFooter({ text: "Tight lines!" })
    .setTimestamp();
}

function makeFailureEmbed(interaction) {
  return new EmbedBuilder()
    .setColor("#ed4245")
    .setTitle("🎣 Nothing Caught")
    .setDescription("The water stayed quiet and nothing bit today.")
    .setAuthor({
      name: interaction.user.tag,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true })
    })
    .addFields({ name: "Try Again", value: "Use your next cast to catch something better.", inline: false })
    .setFooter({ text: "Better luck next time" })
    .setTimestamp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fish")
    .setDescription("Go fishing"),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    const user = await economy.getUser(interaction.user.id, interaction.guild.id);
    const last = user.cooldowns.fish ? user.cooldowns.fish.getTime() : 0;
    const now = Date.now();
    const remaining = COOLDOWN - (now - last);

    if (remaining > 0) {
      const endTime = last + COOLDOWN;
      const makeEmbed = () => makeCooldownEmbed(Math.max(endTime - Date.now(), 0), interaction);

      const msg = await interaction.editReply({ embeds: [makeEmbed()] });
      const interval = setInterval(async () => {
        const left = endTime - Date.now();

        if (left <= 0) {
          clearInterval(interval);
          return msg.edit({
            embeds: [
              new EmbedBuilder()
                .setColor("#57f287")
                .setTitle("🎣 Ready to Fish")
                .setDescription("The water is calm again. Cast your line!")
                .setAuthor({
                  name: interaction.user.tag,
                  iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setFooter({ text: "Fishing command" })
                .setTimestamp()
            ]
          }).catch(() => {});
        }

        msg.edit({ embeds: [makeEmbed()] }).catch(() => clearInterval(interval));
      }, 5000);

      return;
    }

    user.cooldowns.fish = new Date();
    let idx = Math.floor(Math.random() * FISH.length);
    let fish = FISH[idx];

    // apply fishing rod upgrades
    const rodLevel = (user.upgrades && user.upgrades.fishingRod) || 0;
    let chanceBonus = rodLevel * 5; // +5% per level
    const extraQty = Math.floor(rodLevel / 2);

    // auto-use bait if available (consumable units stored in upgrades.bait)
    const baitCount = (user.upgrades && user.upgrades.bait) || 0;
    const BAIT_BONUS = 5; // +5% chance per bait consumed
    let usedBait = 0;
    if (baitCount > 0) {
      usedBait = 1;
      user.upgrades.bait = baitCount - 1;
      chanceBonus += BAIT_BONUS;
    }

    const effectiveChance = Math.max(2, Math.min(100, fish.chance + chanceBonus));

    // extra luck promotion (one-time upgrade)
    const hasExtraLuck = (user.upgrades && user.upgrades.extraLuck) ? 1 : 0;
    const promotionChance = hasExtraLuck ? 10 : 0; // fixed 10% if user has extraLuck

    const roll = Math.random() * 100;

    if (roll <= effectiveChance) {
      // promotion roll
      if (hasExtraLuck && Math.random() * 100 <= promotionChance) {
        idx = Math.min(FISH.length - 1, idx + 1);
        fish = FISH[idx];
      }

      const qty = Math.min(5, 1 + extraQty);
      const current = user.items.get(fish.key) || 0;
      user.items.set(fish.key, current + qty);
      await user.save();

      const embed = makeSuccessEmbed(fish, interaction)
        .setDescription(`You reeled in **${qty}x ${fish.name}**!`)
        .spliceFields(1, 1, { name: "Catch Chance", value: `${effectiveChance}%`, inline: true })
        .addFields({ name: '🍀 Extra Luck', value: `${promotionChance}% chance to upgrade catch`, inline: true })
        .addFields(usedBait ? { name: '🪱 Bait', value: `Auto-used 1 bait (+${BAIT_BONUS}% chance)`, inline: true } : []);

      return interaction.editReply({ embeds: [embed] });
    }

    await user.save();
    return interaction.editReply({ embeds: [makeFailureEmbed(interaction)] });
  }
};