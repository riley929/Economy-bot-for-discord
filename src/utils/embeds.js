const { EmbedBuilder } = require('discord.js');

function baseEmbed(title, description, color = '#2b2d31') {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

function successEmbed(title, description) {
  return baseEmbed(title, description, '#57f287');
}

function errorEmbed(title, description) {
  return baseEmbed(title, description, '#ed4245');
}

function infoEmbed(title, description) {
  return baseEmbed(title, description, '#5865f2');
}

function warningEmbed(title, description) {
  return baseEmbed(title, description, '#fee75c');
}

module.exports = {
  baseEmbed,
  successEmbed,
  errorEmbed,
  infoEmbed,
  warningEmbed
};