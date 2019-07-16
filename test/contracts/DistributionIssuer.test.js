/* eslint max-len:0 */
const expectThrow = require('../utils.js').expectThrow;

const SimpleToken = artifacts.require('SimpleToken');
const DistributionIssuer = artifacts.require('DistributionIssuer');

contract('DistributionIssuer', (accounts) => {
  const owner = accounts[0];
  const payee1 = accounts[1];
  const payee2 = accounts[2];
  const payee3 = accounts[3];
  let ST;
  let DI;
  let tokenAddress;

  beforeEach(async () => {
    ST = await SimpleToken.new({ from: owner });
    tokenAddress = ST.address;
    DI = await DistributionIssuer.new();
  });

  describe('pushDistributionsToAddresses', () => {
    it('distributions get issued in the correct amounts to 3 payees', async () => {
      const payees = [
        payee1,
        payee2,
        payee3,
      ];
      const tokenAmounts = [
        10,
        10,
        10,
      ];
      const tokenAmountSum = tokenAmounts.reduce((a, b) => a + b, 0);

      await ST.approve(DI.address, tokenAmountSum, { from: owner });

      await DI.pushDistributionsToAddresses(
        tokenAddress,
        payees,
        tokenAmounts,
      );

      const payeeBalance1 = await ST.balanceOf.call(payees[0]);
      const payeeBalance2 = await ST.balanceOf.call(payees[1]);
      const payeeBalance3 = await ST.balanceOf.call(payees[2]);

      assert.strictEqual(tokenAmounts[0], payeeBalance1.toNumber());
      assert.strictEqual(tokenAmounts[1], payeeBalance2.toNumber());
      assert.strictEqual(tokenAmounts[2], payeeBalance3.toNumber());
    });

    it('distributions get issued in the correct amounts to 69 payees', async () => {
      const payees = Array.apply(null, Array(69)).map(() => payee1);
      const tokenAmounts = Array.apply(null, Array(69)).map(() => 10);
      const tokenAmountSum = tokenAmounts.reduce((a, b) => a + b, 0);

      await ST.approve(DI.address, tokenAmountSum, { from: owner });

      await DI.pushDistributionsToAddresses(
        tokenAddress,
        payees,
        tokenAmounts,
      );

      const payeeBalance = await ST.balanceOf.call(payee1);

      assert.strictEqual(tokenAmountSum, payeeBalance.toNumber());
    });

    it('fails if the length of payees is greater than MAX_PAYEES_LENGTH', async () => {
      const payees = Array.apply(null, Array(70)).map(() => payee1);
      const tokenAmounts = Array.apply(null, Array(70)).map(() => 10);
      const tokenAmountSum = tokenAmounts.reduce((a, b) => a + b, 0);

      await ST.approve(DI.address, tokenAmountSum, { from: owner });

      await expectThrow(
        DI.pushDistributionsToAddresses(
          tokenAddress,
          payees,
          tokenAmounts,
        ),
      );
    });

    it('fails if the length of payees and tokenAmounts differ', async () => {
      const payees = [
        payee1,
        payee2,
        payee3,
      ];
      const tokenAmounts = [
        10,
        10,
        10,
        10,
      ];
      const tokenAmountSum = tokenAmounts.reduce((a, b) => a + b, 0);

      await ST.approve(DI.address, tokenAmountSum, { from: owner });

      await expectThrow(
        DI.pushDistributionsToAddresses(
          tokenAddress,
          payees,
          tokenAmounts,
        ),
      );
    });

    it('it fails if DistributionIssuer not approved at all to transferFrom', async () => {
      const errMsg = 'Should not distribute to any payees if not authorized';
      const payees = [
        payee1,
        payee2,
        payee3,
      ];
      const tokenAmounts = [
        10,
        10,
        10,
      ];

      await expectThrow(
        DI.pushDistributionsToAddresses(
          tokenAddress,
          payees,
          tokenAmounts,
        ),
        errMsg,
      );

      const payeeBalance1 = await ST.balanceOf.call(payees[0]);
      const payeeBalance2 = await ST.balanceOf.call(payees[1]);
      const payeeBalance3 = await ST.balanceOf.call(payees[2]);

      assert.strictEqual(payeeBalance1.toNumber(), 0);
      assert.strictEqual(payeeBalance2.toNumber(), 0);
      assert.strictEqual(payeeBalance3.toNumber(), 0);
    });

    it('it fails if DistributionIssuer not approved enough to transferFrom', async () => {
      const errMsg = 'Should not distribute to any payees if not authorized for full amount';
      const payees = [
        payee1,
        payee2,
        payee3,
      ];
      const tokenAmounts = [
        10,
        10,
        10,
      ];
      const tokenAmountSum = tokenAmounts.reduce((a, b) => a + b, 0);

      await ST.approve(DI.address, tokenAmountSum - 1, { from: owner });

      await expectThrow(
        DI.pushDistributionsToAddresses(
          tokenAddress,
          payees,
          tokenAmounts,
        ),
        errMsg,
      );

      const payeeBalance1 = await ST.balanceOf.call(payees[0]);
      const payeeBalance2 = await ST.balanceOf.call(payees[1]);
      const payeeBalance3 = await ST.balanceOf.call(payees[2]);

      assert.strictEqual(payeeBalance1.toNumber(), 0);
      assert.strictEqual(payeeBalance2.toNumber(), 0);
      assert.strictEqual(payeeBalance3.toNumber(), 0);
    });

    it('it fails if owner does not have sufficient balance', async () => {
      const errMsg = 'Should not distribute to any payees if not sufficient funds';
      const startBalance = await ST.balanceOf.call(owner);
      const tokenAmountSum = startBalance.plus(2);
      const payees = [
        payee1,
        payee2,
      ];
      const tokenAmounts = [
        tokenAmountSum.div(2),
        tokenAmountSum.div(2),
      ];

      await ST.approve(DI.address, tokenAmountSum, { from: owner });

      await expectThrow(
        DI.pushDistributionsToAddresses(
          tokenAddress,
          payees,
          tokenAmounts,
        ),
        errMsg,
      );

      const payeeBalance1 = await ST.balanceOf.call(payees[0]);
      const payeeBalance2 = await ST.balanceOf.call(payees[1]);

      assert.strictEqual(payeeBalance1.toNumber(), 0);
      assert.strictEqual(payeeBalance2.toNumber(), 0);
    });
  });
});
