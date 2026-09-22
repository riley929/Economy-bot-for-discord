const express = require('express');
const session = require('express-session');
const axios = require('axios');
const path = require('path');

const Guild = require('../database/schemas/Guild');
const User = require('../database/schemas/User');
const Order = require('../database/schemas/Order');


const OWNER_ID = '1364717311386325043';
const OWNER_ID_2 = '1312903688209301565';

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/auth/discord');
  next();
}

function requireOwner(req, res, next) {
  if (!req.session.user) return res.redirect('/auth/discord');

  if (req.session.user.id !== OWNER_ID && req.session.user.id !== OWNER_ID_2) {
    return res.status(403).send('403 — You are not allowed to access this dashboard.');
  }

  next();
}

async function resolveDiscordUsername(client, userId) {
  if (!client || !client.users) {
    return userId;
  }

  const cachedUser = client.users.cache.get(userId);
  if (cachedUser) return `${cachedUser.username}#${cachedUser.discriminator}`;

  const fetchedUser = await client.users.fetch(userId).catch(() => null);
  if (fetchedUser) return `${fetchedUser.username}#${fetchedUser.discriminator}`;

  return userId;
}

function startDashboard(client) {
  const app = express();

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  if (!process.env.SESSION_SECRET) {
    console.error('❌ SESSION_SECRET is not set in .env file. Dashboard authentication will be insecure.');
    process.exit(1);
  }

  app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
  }));

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '../views'));

  app.get('/', requireOwner, async (req, res) => {
    const guildId = process.env.GUILD_ID;

    const users = await User.find({ guildId })
      .sort({ wallet: -1, bank: -1 })
      .limit(10);

    const orders = await Order.find({ guildId })
      .sort({ createdAt: -1 })
      .limit(10);

    const guildStats = await Guild.findOne({ guildId });

    // Calculate aggregate stats
    const allUsers = await User.find({ guildId });
    const totalProfiles = allUsers.length;
    const totalWallet = allUsers.reduce((sum, u) => sum + (u.wallet || 0), 0);
    const totalBank = allUsers.reduce((sum, u) => sum + (u.bank || 0), 0);
    const totalUserMoney = users.reduce((sum, u) => sum + ((u.wallet || 0) + (u.bank || 0)), 0);
    const flaggedCount = allUsers.filter(u => u.flags > 0).length;
    const blacklistedCount = allUsers.filter(u => u.blacklisted).length;

    // Gambling stats
    const totalBets = allUsers.reduce((sum, u) => sum + (u.bets || 0), 0);
    const totalWins = allUsers.reduce((sum, u) => sum + (u.wins || 0), 0);
    const totalLosses = allUsers.reduce((sum, u) => sum + (u.losses || 0), 0);
    const winRate = totalBets > 0 ? Math.round((totalWins / totalBets) * 100) : 0;
    const burned = guildStats?.burnedMoney || 0;

    // Orders
    const pendingOrders = await Order.countDocuments({ guildId, status: 'pending' });
    const completedOrders = await Order.countDocuments({ guildId, status: 'completed' });
    const cancelledOrders = await Order.countDocuments({ guildId, status: 'cancelled' });

    const usersWithNames = await Promise.all(
      users.map(async user => ({
        ...user.toObject(),
        username: client ? await resolveDiscordUsername(client, user.userId) : user.userId
      }))
    );

    res.render('dashboard', {
      user: req.session.user,
      users: usersWithNames,
      orders,
      guildStats,
      totalProfiles,
      totalWallet,
      totalBank,
      totalUserMoney,
      flaggedCount,
      blacklistedCount,
      totalBets,
      totalWins,
      totalLosses,
      winRate,
      burned,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      
    });
  });

  app.get('/users', requireOwner, async (req, res) => {
    try {
      const guildId = process.env.GUILD_ID;
      const users = await User.find({ guildId }).sort({ wallet: -1 });

      const usersWithNames = await Promise.allSettled(
        users.map(async user => {
          const cachedUser = client?.users?.cache?.get(user.userId);
          if (cachedUser) {
            return {
              ...user.toObject(),
              username: `${cachedUser.username}#${cachedUser.discriminator}`
            };
          }

          // Try to fetch with 2 second timeout
          try {
            const fetched = await Promise.race([
              client?.users?.fetch(user.userId),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
            ]);
            return {
              ...user.toObject(),
              username: `${fetched.username}#${fetched.discriminator}`
            };
          } catch (e) {
            return {
              ...user.toObject(),
              username: user.userId
            };
          }
        })
      );

      const resolvedUsers = usersWithNames
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

      res.render('users', {
        user: req.session.user,
        users: resolvedUsers
      });
    } catch (err) {
      console.error('Error loading users page:', err);
      res.status(500).send('Error loading users page');
    }
  });

  app.post('/users/:userId/money', requireOwner, async (req, res) => {
    const guildId = process.env.GUILD_ID;
    const { wallet, bank } = req.body;

    await User.findOneAndUpdate(
      { guildId, userId: req.params.userId },
      {
        wallet: Number(wallet) || 0,
        bank: Number(bank) || 0
      },
      { upsert: true }
    );

    res.redirect('/users');
  });

  app.post('/users/:userId/blacklist', requireOwner, async (req, res) => {
    const guildId = process.env.GUILD_ID;

    const user = await User.findOne({ guildId, userId: req.params.userId });
    if (!user) return res.redirect('/users');

    user.blacklisted = !user.blacklisted;
    await user.save();

    res.redirect('/users');
  });

  app.get('/orders', requireOwner, async (req, res) => {
    const guildId = process.env.GUILD_ID;
    const orders = await Order.find({ guildId }).sort({ createdAt: -1 });

    res.render('orders', {
      user: req.session.user,
      orders
    });
  });

  app.post('/orders/:orderId/status', requireOwner, async (req, res) => {
    const guildId = process.env.GUILD_ID;

    await Order.findOneAndUpdate(
      {
        guildId,
        orderId: req.params.orderId
      },
      {
        status: req.body.status,
        claimedBy: req.session.user.id,
        claimedAt: new Date()
      }
    );

    res.redirect('/orders');
  });

  app.get('/auth/discord', (req, res) => {
    const params = new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      redirect_uri: `${process.env.DASHBOARD_URL}/auth/discord/callback`,
      response_type: 'code',
      scope: 'identify'
    });

    res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
  });

// ===================== BULK TOOLS =====================

app.get('/bulk', requireOwner, (req, res) => {
  res.render('bulktools', {
    user: req.session.user
  });
});

// 🚫 REMOVE ALL FLAGS
app.post('/bulk/remove-flags', requireOwner, async (req, res) => {
  await User.updateMany({}, { flags: 0 });
  res.redirect('/bulk');
});

// 💰 RESET ECONOMY
app.post('/bulk/reset-economy', requireOwner, async (req, res) => {
  await User.updateMany({}, {
    wallet: 0,
    bank: 0
  });

  res.redirect('/bulk');
});

// 👥 RESET ALL USERS
app.post('/bulk/reset-all', requireOwner, async (req, res) => {
  if (req.body.confirm && req.body.confirm !== "CONFIRM ALL WIPE") {
    return res.send("Type CONFIRM ALL WIPE");
  }

  await User.updateMany({}, {
    wallet: 0,
    bank: 0,
    flags: 0,
    blacklisted: false
  });

  await Order.deleteMany({});

  res.redirect('/bulk');
});

// 📦 CLEAR ALL ORDERS
app.post('/bulk/clear-orders', requireOwner, async (req, res) => {
  await Order.deleteMany({});
  res.redirect('/bulk');
});

// 🧠 PANIC LOCK (toggle system)
app.post('/bulk/panic-enable', requireOwner, async (req, res) => {
  await Guild.findOneAndUpdate(
    { guildId: process.env.GUILD_ID },
    { $set: { panicMode: true } },
    { upsert: true }
  );

  res.redirect('/bulk');
});

app.post('/bulk/panic-disable', requireOwner, async (req, res) => {
  await Guild.findOneAndUpdate(
    { guildId: process.env.GUILD_ID },
    { $set: { panicMode: false } },
    { upsert: true }
  );

  res.redirect('/bulk');
});

app.post('/bulk/nuke-economy', requireOwner, async (req, res) => {
  if (req.body.confirm !== "CONFIRM WIPE")
    return res.send("Type CONFIRM WIPE");

  await User.updateMany({}, {
    wallet: 0,
    bank: 0
  });

  res.redirect('/bulk');
});

app.post('/bulk/nuke-all', requireOwner, async (req, res) => {
  if (req.body.confirm !== "CONFIRM ALL WIPE")
    return res.send("Type CONFIRM ALL WIPE");

  await User.deleteMany({});
  await Order.deleteMany({});
  await Guild.deleteMany({});

  res.redirect('/bulk');
});

// 🔄 SOFT RESET (gambling stats only)
app.post('/bulk/soft-reset', requireOwner, async (req, res) => {
  await User.updateMany({}, {
    wins: 0,
    losses: 0,
    bets: 0
  });

  res.redirect('/bulk');
});


// ===================== DANGER ZONE =====================

// 💀 NUKE ECONOMY
app.post('/bulk/nuke-economy', requireOwner, async (req, res) => {
  if (req.body.confirm !== "CONFIRM WIPE") {
    return res.send("Type CONFIRM WIPE");
  }

  await User.updateMany({}, {
    wallet: 0,
    bank: 0
  });

  res.redirect('/bulk');
});

// 💀 NUKE EVERYTHING
app.post('/bulk/nuke-all', requireOwner, async (req, res) => {
  if (req.body.confirm !== "CONFIRM ALL WIPE") {
    return res.send("Type CONFIRM ALL WIPE");
  }

  await User.deleteMany({});
  await Order.deleteMany({});
  await Guild.deleteMany({});

  res.redirect('/bulk');
});


app.get('/servers', requireOwner, (req, res) => {

  const botGuilds = client.guilds.cache
    .map(guild => ({
      id: guild.id,
      name: guild.name,
      memberCount: guild.memberCount,
      icon: guild.iconURL({ extension: 'png', size: 64 })
    }))
    .sort((a, b) => b.memberCount - a.memberCount);

  res.render('servers', {
    user: req.session.user,
    botGuilds: botGuilds   
  });

});

  app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code;

    if (!code) return res.send('No code provided.');

    try {
      const tokenResponse = await axios.post(
        'https://discord.com/api/oauth2/token',
        new URLSearchParams({
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: `${process.env.DASHBOARD_URL}/auth/discord/callback`
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const accessToken = tokenResponse.data.access_token;

      const userResponse = await axios.get('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      req.session.user = userResponse.data;
      res.redirect('/');
    } catch (err) {
      console.error(err.response?.data || err);
      res.send('Discord login failed.');
    }
  });


app.post('/servers/:id/leave', requireOwner, async (req, res) => {
  try {
    const guild = client.guilds.cache.get(req.params.id);

    if (!guild) return res.redirect('/servers');

    await guild.leave();

    res.redirect('/servers');
  } catch (err) {
    console.error(err);
    res.redirect('/servers');
  }
});

app.get('/servers/:id', requireOwner, async (req, res) => {
  const guild = client.guilds.cache.get(req.params.id);

  if (!guild) {
    return res.redirect('/servers');
  }

  const guildStats = await Guild.findOne({ guildId: guild.id });

  const users = await User.find({ guildId: guild.id });
  const orders = await Order.find({ guildId: guild.id });

  res.render('servers', {
    user: req.session.user,

    guild: {
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL({ extension: 'png', size: 128 }),
      memberCount: guild.memberCount
    },

    guildStats,
    users,
    orders
  });
});




  app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/auth/discord'));
  });

  app.listen(process.env.DASHBOARD_PORT || 5050, () => {
    console.log(`🌐 Dashboard running on ${process.env.DASHBOARD_URL}`);
  });
}

module.exports = {
  startDashboard
};