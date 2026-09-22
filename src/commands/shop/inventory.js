const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const economy = require("../../systems/economy/economyManager");
const shopManager = require('../../systems/shop/shopManager');
function errorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor("#ed4245")
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

function mapToArray(map) {
  if (!map) return [];
  const arr = [];

  for (const [key, value] of map.entries()) {
    if (value > 0) arr.push({ key, value });
  }

  return arr;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("View your inventory"),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    const user = await economy.getUser(interaction.user.id, interaction.guild.id);

    const legacy = user.inventory || [];
    const items = mapToArray(user.items);

    if (!legacy.length && !items.length) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            "🎒 Empty Inventory",
            "Go fish, hunt, mine or buy items from the market."
          )
        ]
      });
    }

    
    const fishKeys = ["fish", "salmon","tuna","cod","trout","bass","shark","dolphin","whale","sardine","mackerel","anchovy","catfish","gar","pike","eel","ray","manta","marlin","swordfish","lobster","crab","octopus","jellyfish","seahorse","sea_turtle","koi","carp","anglerfish","tilapia","pollock","halibut","pufferfish","sunfish","barracuda","goldfish","rockfish","bluefish","sturgeon"];
    const huntKeys = ["rabbit", "deer", "fox", "wolf", "bear", "tiger", "squirrel", "boar", "moose", "elk", "bison", "lynx", "panther", "cougar", "badger", "bobcat", "mongoose", "hyena", "jackal", "warthog", "armadillo", "tapir", "antelope", "gazelle", "lemur", "pangolin","otter","raccoon","camel","wildhorse","serval","wolverine","coyote","meerkat","cheetah","hippopotamus"];
    const mineKeys = ["stone", "coal", "iron", "gold", "diamond", "ruby", "emerald", "copper", "nickel", "silver", "platinum", "opal", "topaz", "sapphire", "onyx", "lapis", "obsidian", "meteorite", "mithril", "titanium", "crystal", "zircon", "peridot", "amethyst", "garnet", "beryl", "quartz","jade","pearl","citrine","alexandrite","sardonyx","tourmaline","malachite","hematite","agate","jasper"];

    const fish = items.filter(i => fishKeys.includes(i.key));
    const hunt = items.filter(i => huntKeys.includes(i.key));
    const mine = items.filter(i => mineKeys.includes(i.key));
    const other = items.filter(i => !fishKeys.includes(i.key) && !huntKeys.includes(i.key) && !mineKeys.includes(i.key));

    const legacyItems = legacy;

    const format = (arr, emoji) =>
      arr.length
        ? arr
            .map((i, index) => `${emoji} **${index + 1}. ${i.key}** • x${i.value.toLocaleString()}`)
            .join("\n")
        : "None";

    const upgrades = user.upgrades || {};

    const upgradeKeys = [
      { key: "fishingRod", label: "Fishing Rod" },
      { key: "pickaxe", label: "Pickaxe" },
      { key: "huntingGear", label: "Hunting Gear" },
      { key: "extraLuck", label: "Extra Luck" },
      { key: "bait", label: "Bait" },
      { key: "backpack", label: "Backpack" },
      { key: "bombs", label: "Bombs" }
    ];

    const upgradesText = upgradeKeys
      .map(u => `${u.label}: Level **${upgrades[u.key] || 0}**`)
      .join("\n");

    const embed = new EmbedBuilder()
      .setColor("#2b2d31")
      .setTitle("🎒 Inventory")
      .setDescription("```ansi\n\u001b[1;36mRPG Inventory System\u001b[0m```")
      .addFields(
        {
          name: "🪙 Boosts & Special Items",
          value:
            legacyItems.length
              ? legacyItems
  .map((i, idx) => {
    const item = shopManager.getItemById(i.itemId);

    return `⭐ **${idx + 1}. ${item?.name || i.itemId}** • x${i.quantity}`;
  })
  .join("\n")
              : "None",
          inline: false
        },
        {
          name: "🎣 Fishing Loot",
          value: format(fish, "🎣"),
          inline: true
        },
        {
          name: "🏹 Hunting Loot",
          value: format(hunt, "🏹"),
          inline: true
        },
        {
          name: "⛏️ Mining Loot",
          value: format(mine, "⛏️"),
          inline: true
        },
        {
          name: "📦 Other Loot",
          value: format(other, "📦"),
          inline: true
        }
      )
      .addFields({ name: "🔧 Upgrades", value: upgradesText, inline: true })
      .addFields(
        {
          name: "📊 Stats",
          value:
            `🎣 Fish Types: **${fish.length}**\n` +
            `🏹 Animals: **${hunt.length}**\n` +
            `⛏️ Ores: **${mine.length}**\n` +
            `📦 Other: **${other.length}**`,
          inline: true
        },
        {
          name: "👤 Player",
          value: `${interaction.user}`,
          inline: true
        }
      )
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};