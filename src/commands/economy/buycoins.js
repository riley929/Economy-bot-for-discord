const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const { APP_ID, COIN_SKUS } = require("../../config/coinSkus");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("buycoins")
    .setDescription("Buy Clover Coins from the Discord store"),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }

    const packs = Object.entries(COIN_SKUS);

    const embed = new EmbedBuilder()
      .setColor("#57f287")
      .setTitle("💰 Buy Clover Coins")
      .setDescription(
        "Pick a coin pack below. Discord will handle the checkout.\n\n" +
          packs
            .map(([skuId, pack]) => {
              return `**${pack.name}** — ${pack.price}\n` +
                `Store link: https://discord.com/application-directory/${APP_ID}/store/${skuId}`;
            })
            .join("\n\n") +
          "\n\nAfter buying, run `/claimpurchase` to receive your coins."
      )
      .setTimestamp();

    const rows = [];
    let currentRow = new ActionRowBuilder();

    packs.forEach(([skuId, pack], index) => {
      const button = new ButtonBuilder()
        .setStyle(ButtonStyle.Premium)
        .setSKUId(skuId);

      currentRow.addComponents(button);

      if (currentRow.components.length === 5 || index === packs.length - 1) {
        rows.push(currentRow);
        currentRow = new ActionRowBuilder();
      }
    });

    return interaction.editReply({
      embeds: [embed],
      components: rows,
    });
  },
};