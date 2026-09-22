require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const connectDatabase = require('./database/connection');
const { startBot } = require('./bot');

(async () => {
  await connectDatabase();
  startBot();
})();