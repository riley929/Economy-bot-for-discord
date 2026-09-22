const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("updates")
    .setDescription("View the latest eco-bot update"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor("#5865f2")
      .setTitle("📢 ECO UPDATE — New Economy Features")
      .setDescription(
        [
          "Clover just got a major progression upgrade: achievements, daily deals, richer economy feedback, and better embed polish.",
          "",
          "**✨ What changed**",
          "• Added a brand-new achievements system for progression across economy and gambling",
          "• New unlocks include daily streaks, work earning milestones, shrewd shopping, boost usage, mystery boxes, and jackpot wins",
          "• Achievement unlocks now show directly in completion embeds for `/daily`, `/work`, `/use`, `/buy`, and jackpot slot wins",
          "• Daily shop deals are now visible in `/shop` and automatically apply a 25% discount at checkout",
          "• Shop purchases now track progression and award milestone achievements for repeat buyers and wealth growth",
          "• Mystery boxes now give random coin rewards and unlock the Lucky Break achievement",
          "• Boost items now award the Power User achievement when used successfully",
          "• Jackpot winners now trigger a special achievement and server announcement for huge wins",
          "",
          "**📊 Economy upgrades**",
          "• Profiles now show lifetime earned, lifetime spent, active boosts, rank status, net worth, and achievements",
          "• Daily and work commands now present streak details, cooldown status, and reward breakdowns in clean embeds",
          "• More consistent presentation across economy, shop, and gambling embeds",
          "• Better shop purchase feedback with discount/price breakdown and wallet status",
          "• Inventory use now shows remaining quantity and awards achievements where applicable",
          "",
          "**🛠️ Polish & quality-of-life**",
          "• Improved cooldown messaging for daily and work rewards",
          "• Refined shop error handling and validation responses",
          "• Added extra progression hooks to keep players engaged and rewarded",
          "• Enhanced economy UX to make actions feel more meaningful and satisfying",
          "",
          "**🚀 Today’s full update includes**",
          "• Achievement embed notifications added to daily claim, work, shop purchase, item use, and jackpot win flows",
          "• Daily deals now integrate directly into the shop system with a dependable 25% discount",
          "• Profiles now include deeper lifetime economy stats and achievement snippets",
          "• Work command now records work-earned totals and unlocks milestones",
          "• Shop use command now rewards boost and mystery box achievements",
          "• Slots now reward jackpot achievements and announce big wins in chat",
          "",
          "💡 Suggestions? Contact <@1364717311386325043>",
        ].join("\n")
      )
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
