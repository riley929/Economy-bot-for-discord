const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const economy = require("../../systems/economy/economyManager");
const shopManager = require("../../systems/shop/shopManager");
const { getProgressivePrice } = shopManager;

/* ---------------- SHOP DATA ---------------- */

const MARKET_ITEMS = require("../../systems/shop/marketItems");
const { getSellPrice } = require("../../systems/shop/pricingEngine");
const SHOP = MARKET_ITEMS;


/* ---------------- MAIN EMBED ---------------- */

function mainEmbed(user) {
  const shopList = SHOP.map(item => {
    const level = user.upgrades && user.upgrades[item.id] ? user.upgrades[item.id] : 0;
    let extra = '';
    if (item.id === 'extraLuck' && level >= 1) extra = ' (Owned)';
    else if (level >= 1) extra = ` • Level ${level}`;
    const nextCost = getProgressivePrice(item.price, level, 1);
    return `${item.emoji} **${item.name}**${extra} — Next: ${nextCost.toLocaleString()} coins`;
  }).join("\n");

  return new EmbedBuilder()
    .setColor("#0f172a")
    .setTitle("🏪 RPG Market")
    .setDescription(
      "```ansi\n\u001b[1;36mGEAR SHOP\u001b[0m\n```\n" +
      "Get the best equipment for hunting, fishing, and mining.\nUse the buttons below to buy, sell, or clear your loot."
    )
    .addFields(
      {
        name: "🛍️ Available Shop Items",
        value: shopList,
        inline: false
      },
      {
        name: "💰 Wallet",
        value: `\`${user.wallet.toLocaleString()} coins\``,
        inline: true
      },
      {
        name: "📦 Stored Loot",
        value: `\`${user.items?.size || 0}\``,
        inline: true
      },
      {
        name: "⚙️ Current Upgrades",
        value:
          `🎣 Rod: ${user.upgrades?.fishingRod || 0}\n` +
          `⛏️ Pickaxe: ${user.upgrades?.pickaxe || 0}\n` +
          `🏹 Hunt Gear: ${user.upgrades?.huntingGear || 0}\n` +
          `🎒 Backpack: ${user.upgrades?.backpack || 0}`,
        inline: false
      }
    )
    .setFooter({ text: "Buy gear, sell loot, or sell all items." })
    .setTimestamp();
}


/* ---------------- COMMAND ---------------- */

module.exports = {
  data: new SlashCommandBuilder()
    .setName("market")
    .setDescription("Open the RPG market"),

  async execute(interaction) {
    await interaction.deferReply();

    const user = await economy.getUser(interaction.user.id, interaction.guild.id);

    const embed = mainEmbed(user);

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("buy")
        .setLabel("Buy")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🛒"),

      new ButtonBuilder()
        .setCustomId("sell")
        .setLabel("Sell")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("💰"),

      new ButtonBuilder()
        .setCustomId("sellall")
        .setLabel("Sell All")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("💸")
    );

    const msg = await interaction.editReply({
      embeds: [embed],
      components: [buttons]
    });

    const collector = msg.createMessageComponentCollector({ time: 10 * 60 * 1000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: "Not your market.", ephemeral: true });
      }

      await i.deferUpdate().catch(() => {});

      const user = await economy.getUser(i.user.id, interaction.guild.id);

      /* ---------------- BUY MENU (per-item pages) ---------------- */

      if (i.customId === "buy") {
        const perItemMax = 10;
        const pages = SHOP.map(item => {
          const currentCount = item.type === 'upgrade' ? (user.upgrades && user.upgrades[item.id]) || 0 : (user.items && user.items.get(item.id)) || 0;
          const rows = [];
          const maxForItem = item.id === 'extraLuck' ? 1 : perItemMax;
          for (let q = 1; q <= maxForItem; q++) {
            const totalPrice = getProgressivePrice(item.price, currentCount, q);
            rows.push({ qty: q, price: totalPrice });
          }
          return { item, currentCount, rows };
        });

        // effect calculators for upgrades
        const 
        EFFECTS = {
          fishingRod: (level) => ({ chance: level * 5, extra: Math.floor(level / 2), desc: `${level * 5}% catch chance` }),
          pickaxe: (level) => ({ chance: level * 4, extra: Math.floor(level / 2), desc: `${level * 4}% find chance` }),
          huntingGear: (level) => ({ chance: level * 4, extra: Math.floor(level / 3), desc: `${level * 4}% catch chance` }),
          backpack: (level) => ({ desc: `+${level * 5} inventory slots (visual)` }),
          bait: (level) => ({ desc: `${level}x bait (consumable)` }),
          extraLuck: (level) => ({ desc: `10% chance to promote caught items${level >= 1 ? ' (Owned)' : ''}` }),
          bombs: (level) => ({ desc: `${level}x bombs (one-time use)` })
        };

        let page = 0;

        const renderPageEmbed = (pageIndex, viewer) => {
          const p = pages[pageIndex];
          const { item, currentCount, rows } = p;
          const e = new EmbedBuilder()
            .setColor('#0f172a')
            .setTitle(`${item.emoji} ${item.name}`)
            .setDescription(item.type === 'upgrade' ? 'Upgrade your gear to improve your chances and yield.' : 'Consumable item')
            .addFields(
              { name: '💰 Wallet', value: `${viewer.wallet.toLocaleString()} coins`, inline: true },
              { name: '🔢 Current', value: `${currentCount}`, inline: true }
            )
            .setFooter({ text: `Page ${pageIndex + 1} of ${pages.length}` })
            .setTimestamp();

          if (item.type === 'upgrade') {
            const curEffect = EFFECTS[item.id] ? EFFECTS[item.id](currentCount) : { desc: 'No effect' };
            e.addFields({ name: '⚙️ Current Effect', value: curEffect.desc || 'N/A', inline: false });
          }

          const lines = rows.map(r => {
            if (item.type === 'upgrade') {
              const newLevel = currentCount + r.qty;
              const eff = EFFECTS[item.id] ? EFFECTS[item.id](newLevel) : { desc: 'N/A' };
              return `**x${r.qty}** — ${r.price.toLocaleString()} coins → Level **${newLevel}** • ${eff.desc || ''}`;
            }
            return `**x${r.qty}** — ${r.price.toLocaleString()} coins`;
          }).join('\n');

          e.addFields({ name: 'Options', value: lines, inline: false });
          return e;
        };

        const buildButtonRows = (pageIndex) => {
          const p = pages[pageIndex];
          const rows = [];
          const perRow = 5;
          let r = new ActionRowBuilder();
          const maxForItem = p.item.id === 'extraLuck' ? 1 : perItemMax;
          for (let i = 1; i <= maxForItem; i++) {
            const btn = new ButtonBuilder()
              .setCustomId(`buy_opt:${p.item.id}:${i}`)
              .setLabel(`x${i}`)
              .setStyle(ButtonStyle.Primary);

            r.addComponents(btn);
            if (r.components.length === perRow || i === maxForItem) {
              rows.push(r);
              r = new ActionRowBuilder();
            }
          }

          rows.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('page_prev').setLabel('Prev').setStyle(ButtonStyle.Secondary).setDisabled(pageIndex === 0),
            new ButtonBuilder().setCustomId('page_next').setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(pageIndex === pages.length - 1),
            new ButtonBuilder().setCustomId('page_cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
          ));

          return rows;
        };

        const menuMessage = await i.followUp({ embeds: [renderPageEmbed(page, user)], components: buildButtonRows(page), ephemeral: true, fetchReply: true });

        const menuCollector = menuMessage.createMessageComponentCollector({ time: 2 * 60 * 1000 });

        menuCollector.on('collect', async (comp) => {
          if (comp.user.id !== interaction.user.id) return comp.reply({ content: 'Not your market.', ephemeral: true });
          if (!comp.isButton()) return comp.reply({ content: 'Unsupported interaction.', ephemeral: true });

          if (comp.customId === 'page_prev' || comp.customId === 'page_next' || comp.customId === 'page_cancel') {
            if (comp.customId === 'page_prev') page = Math.max(0, page - 1);
            if (comp.customId === 'page_next') page = Math.min(pages.length - 1, page + 1);
            if (comp.customId === 'page_cancel') return comp.update({ content: 'Purchase cancelled.', embeds: [], components: [] }).catch(() => {});

            const refreshedUser = await economy.getUser(interaction.user.id, interaction.guild.id);
            return comp.update({ embeds: [renderPageEmbed(page, refreshedUser)], components: buildButtonRows(page) }).catch(() => {});
          }

          if (comp.customId.startsWith('buy_opt:')) {
            await comp.deferReply({ ephemeral: true }).catch(() => {});
            const payload = comp.customId.split(':').slice(1).join(':');
            const [itemId, qtyStr] = payload.split(':');
            const qty = Number(qtyStr) || 1;
            const item = SHOP.find(x => x.id === itemId);
            if (!item) return comp.followUp({ content: '❌ Invalid selection.', ephemeral: true });

            const result = await shopManager.buyItem(comp.user.id, interaction.guild.id, itemId, qty);

            if (!result || !result.success) {
              const reason = result ? result.reason : 'UNKNOWN_ERROR';
              const failMessage = reason === 'NOT_ENOUGH_MONEY'
                ? `❌ Not enough coins. Need **${result.totalPrice.toLocaleString()} coins**.`
                : reason === 'ALREADY_OWN_EXTRA_LUCK'
                  ? '❌ You already own Extra Luck (max 1).'
                  : reason === 'ITEM_NOT_FOUND'
                    ? '❌ Item not found in shop.'
                    : '❌ Purchase failed.';
              return comp.followUp({ content: failMessage, ephemeral: true });
            }

            const picker = result.user;
            const newEffect = item.type === 'upgrade' && EFFECTS[item.id] ? EFFECTS[item.id](picker.upgrades[item.id]) : null;
            const effectText = newEffect ? ` • New effect: ${newEffect.desc || ''}` : '';
            const refreshedUser = await economy.getUser(comp.user.id, interaction.guild.id);
            await comp.message.edit({ embeds: [renderPageEmbed(page, refreshedUser)], components: buildButtonRows(page) }).catch(() => {});
            return comp.followUp({ content: `✅ Bought **${result.quantity}x ${item.name}** for **${result.totalPrice.toLocaleString()} coins**!${effectText}`, ephemeral: true });
          }
        });

        return;
      }

      /* ---------------- SELL MENU ---------------- */

      if (i.customId === "sell") {
        const items = user.items;

        if (!items || items.size === 0) {
          return i.followUp({
            content: "❌ You have nothing to sell.",
            ephemeral: true
          });
        }

        const menu = new ActionRowBuilder().addComponents();
        // reuse a simple select for selling (kept simple)
        const sellMenu = new (require('discord.js').StringSelectMenuBuilder)()
          .setCustomId("sell_select")
          .setPlaceholder("Select item to sell")
          .addOptions(
            [...items.entries()].map(([key, value]) => ({
              label: `${key} x${value}`,
              value: key
            }))
          );

        const menuMessage = await i.followUp({
          content: "💰 Choose what to sell:",
          components: [new ActionRowBuilder().addComponents(sellMenu)],
          ephemeral: true,
          fetchReply: true
        });

        const menuCollector = menuMessage.createMessageComponentCollector({
          componentType: require('discord.js').ComponentType.StringSelect,
          time: 2 * 60 * 1000
        });

        menuCollector.on("collect", async (selectInteraction) => {
          if (selectInteraction.user.id !== interaction.user.id) {
            return selectInteraction.reply({ content: "Not your market.", ephemeral: true });
          }

          const key = selectInteraction.values[0];
          const amount = user.items.get(key) || 0;

          if (!amount) {
            return selectInteraction.reply({ content: "❌ You don't have this item.", ephemeral: true });
          }

          const value = getSellPrice(key, amount);
          user.items.delete(key);
          user.wallet += value;
          await user.save();

          return selectInteraction.reply({
            content: `💰 Sold **${key} x${amount}** for ${value.toLocaleString()} coins`,
            ephemeral: true
          });
        });

        return;
      }

/* ---------------- SELL ALL ---------------- */

if (i.customId === "sellall") {
  let total = 0;
  let itemsSold = 0;

  for (const [key, value] of user.items.entries()) {
    total += getSellPrice(key, value);
    itemsSold += value;
  }

  user.items.clear();
  user.wallet += total;

  await user.save();

  const sellAllEmbed = new EmbedBuilder()
    .setColor(0x2ECC71)
    .setAuthor({
      name: `${i.user.username} Sold Their Inventory`,
      iconURL: i.user.displayAvatarURL({ dynamic: true })
    })
    .setTitle("💰 Inventory Liquidated")
    .setDescription(
      [
        "All loot has been successfully sold.",
        "",
        `👜 **Items Sold:** \`${itemsSold.toLocaleString()}\``,
        `💸 **Coins Earned:** \`${total.toLocaleString()}\``,
        `🏦 **New Wallet Balance:** \`${user.wallet.toLocaleString()}\``
      ].join("\n")
    )
    .setThumbnail(i.user.displayAvatarURL({ dynamic: true, size: 512 }))
    .setFooter({
      text: "eco-bot • Sell All",
      iconURL: i.client.user.displayAvatarURL()
    })
    .setTimestamp();

  return i.followUp({
    embeds: [sellAllEmbed]
  });

      }
    });

  }
};