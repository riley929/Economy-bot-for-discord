module.exports = {
  fishingRod: (level) => {
    return {
      rarityBoost: 1 + level * 0.05, // +5% per level
      extraRollChance: level * 2
    };
  },

  pickaxe: (level) => {
    return {
      extraOreChance: level * 3,
      multiMineChance: level * 1.5
    };
  },

  huntingGear: (level) => {
    return {
      rareChanceBoost: 1 + level * 0.04
    };
  },

  backpack: (level) => {
    return {
      capacity: 20 + level * 10
    };
  }
};