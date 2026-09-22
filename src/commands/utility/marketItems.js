module.exports = {
  upgrades: {
    fishingRod: {
      name: 'Fishing Rod',
      emoji: '🎣',
      price: 500,
      desc: 'Improves fishing loot quality'
    },
    bait: {
      name: 'Premium Bait',
      emoji: '🪱',
      price: 250,
      desc: 'Boosts catch chance'
    },
    pickaxe: {
      name: 'Pickaxe',
      emoji: '⛏️',
      price: 800,
      desc: 'Better mining rewards'
    },
    huntingGear: {
      name: 'Hunting Gear',
      emoji: '🏹',
      price: 650,
      desc: 'Better animal drops'
    },
    backpack: {
      name: 'Backpack',
      emoji: '🎒',
      price: 1200,
      desc: 'Inventory expansion (future use)'
    },
    bombs: {
      name: 'Mining Bombs',
      emoji: '💣',
      price: 1500,
      desc: 'Chance for jackpot ores'
    }
  },

  sellables: {
    fish: { name: 'Fish', emoji: '🐟', sell: 5 },
    bassFish: { name: 'Bass', emoji: '🐠', sell: 12 },
    salmon: { name: 'Salmon', emoji: '🐡', sell: 25 },
    tuna: { name: 'Tuna', emoji: '🐋', sell: 60 },
    goldFish: { name: 'Golden Fish', emoji: '✨', sell: 150 },

    rabbit: { name: 'Rabbit', emoji: '🐇', sell: 10 },
    fox: { name: 'Fox', emoji: '🦊', sell: 18 },
    deer: { name: 'Deer', emoji: '🦌', sell: 40 },
    wolf: { name: 'Wolf', emoji: '🐺', sell: 80 },
    bear: { name: 'Bear', emoji: '🐻', sell: 150 },

    stone: { name: 'Stone', emoji: '🪨', sell: 2 },
    coal: { name: 'Coal', emoji: '⚫', sell: 5 },
    iron: { name: 'Iron', emoji: '⛓️', sell: 15 },
    gold: { name: 'Gold', emoji: '🪙', sell: 60 },
    diamond: { name: 'Diamond', emoji: '💎', sell: 200 }
  }
};