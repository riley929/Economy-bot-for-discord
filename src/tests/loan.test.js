const test = require('node:test');
const assert = require('node:assert/strict');
const { getLoanTerms, validateLoanAmount } = require('../systems/economy/loanManager');

test('returns the correct tier values for a 50,000 loan', () => {
  const terms = getLoanTerms(50000);

  assert.deepEqual(terms, {
    loanAmount: 50000,
    interestAmount: 20000,
    repaymentAmount: 70000,
    penaltyAmount: 100000
  });
});

test('rejects invalid loan amounts', () => {
  assert.equal(validateLoanAmount(15000), false);
  assert.equal(validateLoanAmount(25000), false);
  assert.equal(validateLoanAmount(10000), true);
  assert.equal(validateLoanAmount(100000), true);
});
