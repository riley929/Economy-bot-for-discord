const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../../systems/economy/economyManager");
const { removeItem } = require("../../systems/shop/inventoryManager");

const COOLDOWN = 5 * 60 * 1000;

const ORES = [
  { key: "stone", name: "Stone", chance: 80, emoji: "🪨" },
  { key: "coal", name: "Coal", chance: 65, emoji: "⚫" },
  { key: "iron", name: "Iron", chance: 50, emoji: "⛓️" },
  { key: "gold", name: "Gold", chance: 35, emoji: "🪙" },
  { key: "diamond", name: "Diamond", chance: 18, emoji: "💎" },
  { key: "ruby", name: "Ruby", chance: 10, emoji: "🔴" },
  { key: "emerald", name: "Emerald", chance: 8, emoji: "🟢" },
  { key: "copper", name: "Copper", chance: 78, emoji: "🟠" },
  { key: "nickel", name: "Nickel", chance: 70, emoji: "⚪" },
  { key: "silver", name: "Silver", chance: 55, emoji: "🥈" },
  { key: "platinum", name: "Platinum", chance: 20, emoji: "⚪" },
  { key: "opal", name: "Opal", chance: 18, emoji: "🌈" },
  { key: "topaz", name: "Topaz", chance: 15, emoji: "🟡" },
  { key: "sapphire", name: "Sapphire", chance: 12, emoji: "🔵" },
  { key: "onyx", name: "Onyx", chance: 10, emoji: "⚫" },
  { key: "lapis", name: "Lapis Lazuli", chance: 22, emoji: "🔷" },
  { key: "obsidian", name: "Obsidian", chance: 9, emoji: "⬛" },
  { key: "meteorite", name: "Meteorite", chance: 5, emoji: "☄️" },
  { key: "mithril", name: "Mithril", chance: 4, emoji: "✨" },
  { key: "titanium", name: "Titanium", chance: 7, emoji: "🔩" },
  { key: "crystal", name: "Crystal Shard", chance: 6, emoji: "🔮" },
  { key: "zircon", name: "Zircon", chance: 11, emoji: "💠" },
  { key: "peridot", name: "Peridot", chance: 13, emoji: "💚" },
  { key: "amethyst", name: "Amethyst", chance: 14, emoji: "🟣" },
  { key: "garnet", name: "Garnet", chance: 17, emoji: "🔴" },
  { key: "beryl", name: "Beryl", chance: 16, emoji: "🟢" },
  { key: "quartz", name: "Quartz", chance: 24, emoji: "⚪" },
  { key: "jade", name: "Jade", chance: 20, emoji: "🟢" },
  { key: "pearl", name: "Pearl", chance: 18, emoji: "🤍" },
  { key: "citrine", name: "Citrine", chance: 16, emoji: "🟡" },
  { key: "alexandrite", name: "Alexandrite", chance: 12, emoji: "💜" },
  { key: "sardonyx", name: "Sardonyx", chance: 14, emoji: "🧡" },
  { key: "tourmaline", name: "Tourmaline", chance: 13, emoji: "🪻" },
  { key: "malachite", name: "Malachite", chance: 15, emoji: "🟢" },
  { key: "hematite", name: "Hematite", chance: 17, emoji: "⚫" },
  { key: "agate", name: "Agate", chance: 19, emoji: "🌈" },
  { key: "jasper", name: "Jasper", chance: 21, emoji: "🟤" }
];



function getRarity(ore) {
  const chance = ore?.chance ?? 0;
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
    .setColor("#f1c40f")
    .setTitle("⛏️ Mining Cooldown")
    .setDescription(`Your pickaxe is resting. Try again in **${formatTime(left)}**`)
    .setAuthor({
      name: interaction.user.tag,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true })
    })
    .addFields(
      { name: "Miner Status", value: "The mine is quiet right now. Come back later.", inline: false },
      { name: "Time Left", value: `**${formatTime(left)}**`, inline: true }
    )
    .setFooter({ text: "Mine command" })
    .setTimestamp();
}

function makeSuccessEmbed(ore, interaction) {
  return new EmbedBuilder()
    .setColor("#57f287")
    .setTitle(`${ore.emoji} Mining Success`)
    .setDescription(`You uncovered **${ore.name}** from the vein.`)
    .setAuthor({
      name: interaction.user.tag,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true })
    })
    .addFields(
      { name: "Ore", value: `${ore.emoji} **${ore.name}**`, inline: true },
      { name: "Chance", value: `${ore.chance}%`, inline: true },
      { name: "Rarity", value: getRarity(ore), inline: true },
      { name: "Inventory", value: "The ore has been added to your stash.", inline: false }
    )
    .setFooter({ text: "Keep mining for rarer finds" })
    .setTimestamp();
}

function makeFailureEmbed(interaction) {
  return new EmbedBuilder()
    .setColor("#ed4245")
    .setTitle("🪨 Nothing Found")
    .setDescription("The seam was barren and your pickaxe hit only dirt.")
    .setAuthor({
      name: interaction.user.tag,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true })
    })
    .addFields({ name: "Tip", value: "Try again later; the mine can be unpredictable.", inline: false })
    .setFooter({ text: "Better luck next dig" })
    .setTimestamp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mine")
    .setDescription("Go mining"),

  async execute(interaction) {
    await interaction.deferReply();

    const user = await economy.getUser(interaction.user.id, interaction.guild.id);
    const last = user.cooldowns.mine ? user.cooldowns.mine.getTime() : 0;
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
                .setTitle("⛏️ Ready to Mine")
                .setDescription("The mine is active again. Strike while the iron is hot!")
                .setAuthor({
                  name: interaction.user.tag,
                  iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setFooter({ text: "Mine command" })
                .setTimestamp()
            ]
          }).catch(() => {});
        }

        msg.edit({ embeds: [makeCooldownEmbed(left, interaction)] }).catch(() => clearInterval(interval));
      }, 5000);

      return;
    }

    user.cooldowns.mine = new Date();
    let idx = Math.floor(Math.random() * ORES.length);
    let ore = ORES[idx];

    // apply pickaxe upgrades
    const pickLevel = (user.upgrades && user.upgrades.pickaxe) || 0;
    const chanceBonus = pickLevel * 4; // +4% per level
    const effectiveChance = Math.max(2, Math.min(100, ore.chance + chanceBonus));
    const extraQty = Math.floor(pickLevel / 2);

    // extra luck promotion (one-time upgrade)
    const hasExtraLuck = (user.upgrades && user.upgrades.extraLuck) ? 1 : 0;
    const promotionChance = hasExtraLuck ? 10 : 0;

    // auto-use bombs from user's inventory (item with itemId 'bombs')
    let usedBomb = false;
    const bombEntry = user.inventory.find(i => i.itemId === 'bombs');
    if (bombEntry && bombEntry.quantity > 0) {
      // consume one bomb
      removeItem(user, 'bombs', 1);
      usedBomb = true;
    }

    const roll = Math.random() * 100;

    if (roll <= effectiveChance) {
      if (hasExtraLuck && Math.random() * 100 <= promotionChance) {
        idx = Math.min(ORES.length - 1, idx + 1);
        ore = ORES[idx];
      }

      const qty = Math.min(5, 1 + extraQty + (usedBomb ? 2 : 0));
      const current = user.items.get(ore.key) || 0;
      user.items.set(ore.key, current + qty);
      await user.save();

      const embed = makeSuccessEmbed(ore, interaction)
        .setDescription(`You uncovered **${qty}x ${ore.name}** from the vein.`)
        .spliceFields(1, 1, { name: "Chance", value: `${effectiveChance}%`, inline: true })
        .addFields({ name: '🍀 Extra Luck', value: `${promotionChance}% chance to upgrade ore`, inline: true })
        .addFields(usedBomb ? { name: '💣 Bomb', value: `Auto-used 1 bomb (+2 bonus ore)`, inline: true } : []);

      return interaction.editReply({ embeds: [embed] });
    }

    await user.save();
    return interaction.editReply({ embeds: [makeFailureEmbed(interaction)] });
  }
};