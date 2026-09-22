const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const economy = require("../../systems/economy/economyManager");
const { APP_ID, COIN_SKUS } = require("../../config/coinSkus");

const DISCORD_API = "https://discord.com/api/v10";
const CLAIMED_FILE = path.join(process.cwd(), "claimedPurchases.json");

function loadClaimedPurchases() {
  try {
    if (!fs.existsSync(CLAIMED_FILE)) {
      fs.writeFileSync(CLAIMED_FILE, JSON.stringify({}, null, 2));
    }

    return JSON.parse(fs.readFileSync(CLAIMED_FILE, "utf8"));
  } catch (err) {
    console.error("Failed to load claimedPurchases.json:", err);
    return {};
  }
}

function saveClaimedPurchases(data) {
  fs.writeFileSync(CLAIMED_FILE, JSON.stringify(data, null, 2));
}

async function discordApi(path, options = {}) {
  const token = process.env.TOKEN || process.env.DISCORD_TOKEN;

  if (!token) {
    throw new Error("Missing bot token. Add TOKEN or DISCORD_TOKEN to your .env");
  }

  const res = await fetch(`${DISCORD_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Discord API ${res.status}: ${text}`);
  }

  if (res.status === 204) return null;

  return res.json();
}

function errorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor("#ed4245")
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

function successEmbed(interaction, pack, user) {
  return new EmbedBuilder()
    .setColor("#57f287")
    .setTitle("💰 Clover Coins Claimed")
    .setDescription(
      `You claimed **${pack.coins.toLocaleString()} Clover Coins**.`
    )
    .addFields(
      {
        name: "📦 Package",
        value: `**${pack.name}**`,
        inline: true,
      },
      {
        name: "💵 Price",
        value: `**${pack.price}**`,
        inline: true,
      },
      {
        name: "💸 New Wallet",
        value: `**${user.wallet.toLocaleString()}** coins`,
        inline: true,
      },
      {
        name: "🏦 Bank",
        value: `**${user.bank.toLocaleString()}** coins`,
        inline: true,
      },
      {
        name: "📊 Net Worth",
        value: `**${((user.wallet || 0) + (user.bank || 0)).toLocaleString()}** coins`,
        inline: true,
      }
    )
    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
    .setFooter({
      text: `Claimed by ${interaction.user.tag}`,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
    })
    .setTimestamp();
}

async function getUserEntitlements(userId) {
  const skuIds = Object.keys(COIN_SKUS).join(",");

  return discordApi(
    `/applications/${APP_ID}/entitlements?user_id=${userId}&sku_ids=${skuIds}`
  );
}

async function consumeEntitlement(entitlementId) {
  return discordApi(
    `/applications/${APP_ID}/entitlements/${entitlementId}/consume`,
    {
      method: "POST",
    }
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("claimpurchase")
    .setDescription("Claim purchased Clover Coins from the Discord store"),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }

    let entitlements;

    try {
      entitlements = await getUserEntitlements(interaction.user.id);
    } catch (err) {
      console.error("Failed to fetch entitlements:", err);

      return interaction.editReply({
        embeds: [
          errorEmbed(
            "❌ Purchase Check Failed",
            "I could not check your Discord purchases right now. Try again in a minute."
          ),
        ],
      });
    }

    const claimed = loadClaimedPurchases();

    const validEntitlement = entitlements.find(entitlement => {
      const skuId = entitlement.sku_id;
      const pack = COIN_SKUS[skuId];

      if (!pack) return false;
      if (entitlement.deleted) return false;
      if (entitlement.consumed) return false;
      if (claimed[entitlement.id]) return false;

      return true;
    });

    if (!validEntitlement) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            "❌ No Claimable Purchase Found",
            "I could not find an unclaimed Clover Coins purchase on your Discord account.\n\n" +
              "Make sure you bought one of the coin packs from the Discord store, then try again."
          ),
        ],
      });
    }

    const pack = COIN_SKUS[validEntitlement.sku_id];

    try {
      const user = await economy.getUser(interaction.user.id, interaction.guild.id);

      user.wallet += pack.coins;

      await user.save();

      claimed[validEntitlement.id] = {
        userId: interaction.user.id,
        guildId: interaction.guild.id,
        skuId: validEntitlement.sku_id,
        coins: pack.coins,
        claimedAt: new Date().toISOString(),
      };

      saveClaimedPurchases(claimed);

      try {
        await consumeEntitlement(validEntitlement.id);
      } catch (consumeErr) {
        console.error(
          "Failed to consume entitlement. Local claim was saved, so it cannot be claimed twice:",
          consumeErr.message
        );
      }

      return interaction.editReply({
        embeds: [successEmbed(interaction, pack, user)],
      });
    } catch (err) {
      console.error("Failed to claim purchase:", err);

      return interaction.editReply({
        embeds: [
          errorEmbed(
            "❌ Claim Failed",
            "I found your purchase, but I could not add the coins. Ask the bot owner to check the logs."
          ),
        ],
      });
    }
  },
};