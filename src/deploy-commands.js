require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];

const commandsPath = path.join(__dirname, 'commands');
const folders = fs.readdirSync(commandsPath);

for (const folder of folders) {
  const folderPath = path.join(commandsPath, folder);
  const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

  for (const file of files) {
    const filePath = path.join(folderPath, file);

    try {
      const command = require(filePath);

      if (command.data && command.execute) {
        commands.push(command.data.toJSON());
        console.log(`✅ Loaded deploy command: ${folder}/${file}`);
      }
    } catch (err) {
      console.error(`❌ Broken command file: ${folder}/${file}`);
      console.error(err);
      process.exit(1);
    }
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log(`🔄 Registering ${commands.length} slash command(s)...`);

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log('✅ Slash commands registered.');
  } catch (error) {
    console.error(error);
  }
})();