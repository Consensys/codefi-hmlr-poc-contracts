/* eslint max-len:0 */
const expectThrow = require('../utils.js').expectThrow;

const InvestorMinValidatorAbstraction = artifacts.require('InvestorMinValidator');
const AssetTokenAbstraction = artifacts.require('AssetToken');

contract('AssetTokens - InvestorMinValidator', (accounts) => {
  const from = accounts[0];
  const investor1 = accounts[1];
  const investorMin = 1;

  const initialSupply = 100000;
  const tokenName = 'ABC Property';
  const decimalUnits = 18;
  const tokenSymbol = 'ABC';

  let instance;
  let token1;
  let token2;

  beforeEach(async () => {
    instance = await InvestorMinValidatorAbstraction.new(investorMin, { from });
    token1 = await AssetTokenAbstraction.new({ from });
    await token1.initialize(
      from,
      initialSupply,
      tokenName,
      decimalUnits,
      tokenSymbol,
      { from },
    );
    await token1.addModule(
      instance.address,
      { from },
    );
    await instance.overrideInvestorCount(token1.address, 1, { from }); // to reflect that the from gets the initial Tokens
    token2 = await AssetTokenAbstraction.new({ from });
    await token2.initialize(
      from,
      initialSupply,
      tokenName,
      decimalUnits,
      tokenSymbol,
      { from },
    );
    await token2.addModule(
      instance.address,
      { from },
    );
    await instance.overrideInvestorCount(token2.address, 1, { from }); // to reflect that the from gets the initial Tokens
  });

  describe('.canSend()', async () => {
    it('validating a transfer on token1 increases investorCount without affecting token2\'s investorCount', async () => {
      const errMsg1 = 'It should increase investorCount for token1';
      const errMsg2 = 'It should not increase investorCount for token2';
      const amount = 1;
      const token1PreCount = await instance.investorCount.call(token1.address);
      assert.equal(token1PreCount.toNumber(), 1);
      const token2PreCount = await instance.investorCount.call(token2.address);
      assert.equal(token2PreCount.toNumber(), 1);

      const toBalance = await token1.balanceOf.call(investor1);
      assert.equal(toBalance.toNumber(), 0);
      await token1.transfer(
        investor1,
        amount,
        { from },
      );
      const token1PostCount = await instance.investorCount.call(token1.address);
      assert.equal(token1PostCount.toNumber(), token1PreCount.toNumber() + 1, errMsg1);

      const token2PostCount = await instance.investorCount.call(token2.address);
      assert.equal(token2PostCount.toNumber(), token2PreCount.toNumber(), errMsg2);
    });

    it('blocks a transfer on token1 when at would be less than min without affecting token2\'s transfer', async () => {
      const errMsg1 = 'It should throw for token1 transfer when at investorMin';
      const errMsg2 = 'It should allow transfer for token2';
      const amount = 1;
      await token1.transfer(investor1, amount, { from }); // so investor1 does not count as new
      await instance.overrideInvestorCount(token1.address, investorMin, { from });

      await token2.transfer(investor1, amount, { from }); // so investor1 does not count as new
      const token2PreCount = await instance.investorCount.call(token2.address);
      assert.equal(token2PreCount.toNumber(), 2);

      const toBalance = await token1.balanceOf.call(investor1);
      assert.equal(toBalance.toNumber(), amount);
      const token1FromBalance = await token1.balanceOf.call(from);
      await expectThrow(
        token1.transfer(investor1, token1FromBalance, { from }), // transfer entirity so would decrease count below min
        errMsg1,
      );

      const token2FromBalance = await token2.balanceOf.call(from);
      await token2.transfer(
        investor1,
        token2FromBalance,
        { from },
      );

      const token2PostCount = await instance.investorCount.call(token2.address);
      assert.equal(token2PostCount.toNumber(), token2PreCount.toNumber() - 1, errMsg2);
    });
  });
});
