function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chance(percent) {
  return Math.random() < percent;
}

function pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
  randomInt,
  chance,
  pick
};