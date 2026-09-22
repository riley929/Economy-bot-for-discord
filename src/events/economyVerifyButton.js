if (interaction.isButton() && interaction.customId === VERIFY_BUTTON_ID) {
  if (!interaction.guild) {
    return interaction.reply({
      content: '❌ This can only be used in a server.',
      ephemeral: true
    });
  }

  const userData = await getOrCreateUser(
    interaction.user.id,
    interaction.guild.id
  );

  if (userData.verified) {
    return interaction.reply({
      content: '✅ You are already verified.',
      ephemeral: true
    });
  }

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

  return interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
}