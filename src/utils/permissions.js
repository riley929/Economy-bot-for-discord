const { OWNER_ID } = require('./constants');

function isOwner(userId) {
  return userId === OWNER_ID;
}

module.exports = {
  isOwner
};