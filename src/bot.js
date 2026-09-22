const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { startApi } = require('./services/dashboard');
const { startDashboard } = require('./services/dashboard');
const { startLoanManager } = require('./systems/economy/loanManager');

function startBot() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });

  global.client = client;
  client.commands = new Collection();

  const commandsPath = path.join(__dirname, 'commands');
  const folders = fs.readdirSync(commandsPath);

  for (const folder of folders) {
    const folderPath = path.join(commandsPath, folder);
    const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

    for (const file of files) {
  const filePath = path.join(folderPath, file);
  const command = require(filePath);

  if (command.data && command.execute) {

    command.category = folder;
    command.filePath = filePath;

    client.commands.set(command.data.name, command);

    console.log(
      `✅ Loaded command: ${folder}/${command.data.name}`
    );
  }
}
  }

  const interactionPath = path.join(__dirname, 'events', 'interaction');
  const interactionFiles = fs.readdirSync(interactionPath).filter(file => file.endsWith('.js'));

  for (const file of interactionFiles) {
    const event = require(path.join(interactionPath, file));

    if (event.name && event.execute) {
      client.on(event.name, (...args) => event.execute(...args, client));
      console.log(`✅ Loaded interaction event: ${file}`);
    }
  }

  const clientPath = path.join(__dirname, 'events', 'client');
  const clientFiles = fs.readdirSync(clientPath).filter(file => file.endsWith('.js'));

  for (const file of clientFiles) {
    const event = require(path.join(clientPath, file));

    if (event.name && event.execute) {
      client.on(event.name, (...args) => event.execute(...args, client));
      console.log(`✅ Loaded client event: ${file}`);
    }
  }

  client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  startDashboard(client);
  startLoanManager();
});

  client.login(process.env.TOKEN);
  
}

module.exports = { startBot };