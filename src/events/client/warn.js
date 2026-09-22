module.exports = {
  name: 'warn',

  execute(info) {
    console.warn('⚠️ Discord client warning:', info);
  }
};