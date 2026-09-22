function getSellPrice(item, quantity = 1) {
  if (item && typeof item === 'object') {
    if (typeof item.sellValue === 'number') {
      return Math.floor(item.sellValue * quantity);
    }

    if (typeof item.price === 'number') {
      return Math.floor(item.price * 0.5 * quantity);
    }
  }

  const itemId = String(item || '').toLowerCase();

const lootSellPrices = {
    fish: 40,
    salmon: 55,
    tuna: 90,
    cod: 45,
    trout: 50,
    bass: 60,
    shark: 180,
    dolphin: 250,
    whale: 500,
    sardine: 40,
    mackerel: 55,
    anchovy: 35,
    catfish: 65,
    gar: 60,
    pike: 75,
    eel: 90,
    ray: 130,
    manta: 180,
    marlin: 320,
    swordfish: 500,
    lobster: 110,
    crab: 80,
    octopus: 140,
    jellyfish: 70,
    seahorse: 90,
    sea_turtle: 300,
    koi: 100,
    carp: 55,
    anglerfish: 700,
    tilapia: 55,
    pollock: 45,
    halibut: 130,
    pufferfish: 100,
    sunfish: 90,
    barracuda: 180,
    goldfish: 70,
    rockfish: 80,
    bluefish: 70,
    sturgeon: 400,

    rabbit: 45,
    deer: 75,
    fox: 90,
    wolf: 220,
    bear: 400,
    tiger: 750,
    squirrel: 40,
    boar: 110,
    moose: 420,
    elk: 250,
    bison: 500,
    lynx: 320,
    panther: 850,
    cougar: 650,
    badger: 70,
    bobcat: 90,
    mongoose: 95,
    hyena: 250,
    jackal: 100,
    warthog: 130,
    armadillo: 80,
    tapir: 170,
    antelope: 120,
    gazelle: 100,
    lemur: 90,
    pangolin: 900,
    otter: 80,
    raccoon: 70,
    camel: 250,
    wildhorse: 300,
    serval: 380,
    wolverine: 600,
    coyote: 120,
    meerkat: 90,
    cheetah: 900,
    hippopotamus: 1000,

    stone: 35,
    coal: 45,
    iron: 60,
    gold: 140,
    diamond: 550,
    ruby: 700,
    emerald: 850,
    copper: 40,
    nickel: 50,
    silver: 100,
    platinum: 320,
    opal: 360,
    topaz: 400,
    sapphire: 600,
    onyx: 480,
    lapis: 280,
    obsidian: 350,
    meteorite: 1800,
    mithril: 1800,
    titanium: 1000,
    crystal: 700,
    zircon: 480,
    peridot: 360,
    amethyst: 550,
    garnet: 400,
    beryl: 450,
    quartz: 90,
    jade: 280,
    pearl: 200,
    citrine: 320,
    alexandrite: 900,
    sardonyx: 550,
    tourmaline: 700,
    malachite: 360,
    hematite: 100,
    agate: 240,
    jasper: 280
};

  const basePrice = lootSellPrices[itemId] ?? 100;
  return Math.floor(basePrice * quantity);
}

function getDailyDealPrice(item) {
  if (!item) return null;

  const discount = 0.25;

  return {
    originalPrice: item.price,
    discount,
    dealPrice: Math.floor(item.price * (1 - discount))
  };
}

function applyDynamicPrice(item, demand = 0) {
  if (!item) return null;

  const demandIncrease = Math.min(demand * 0.02, 0.5);
  return Math.floor(item.price * (1 + demandIncrease));
}

module.exports = {
  getSellPrice,
  getDailyDealPrice,
  applyDynamicPrice
};