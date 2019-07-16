/* eslint max-len:0 */
const MeridioCrowdsaleAbstraction = artifacts.require('MeridioCrowdsale');
const AssetTokenAbstraction = artifacts.require('AssetToken');

const { latestTime } = require('openzeppelin-solidity/test/helpers/latestTime');
const { advanceBlock } = require('openzeppelin-solidity/test/helpers/advanceToBlock');
const { duration } = require('openzeppelin-solidity/test/helpers/increaseTime');

contract('MeridioCrowdSale - buyTokens', function (accounts) {
  const owner = accounts[0];
  const purchaser = accounts[1];

  // variables to launch Crowdsale
  const rate = 1;

  // variables to launch AssetToken
  const initialSupply = 100000;
  const tokenName = 'ABC Property';
  const decimalUnits = 18;
  const tokenSymbol = 'ABC';

  before(async () => {
    await advanceBlock();
    this.token = await AssetTokenAbstraction.new({ from: owner });
    await this.token.initialize(
      owner,
      initialSupply,
      tokenName,
      decimalUnits,
      tokenSymbol,
      { from: owner },
    );

    this.openingTime = (await latestTime());
    this.closingTime = this.openingTime + duration.weeks(1);

    this.crowdsale = await MeridioCrowdsaleAbstraction.new(
      this.openingTime,
      this.closingTime,
      rate,
      this.token.address,
      { from: owner },
    );

    await this.token.approve(this.crowdsale.address, initialSupply, { from: owner });
  });

  describe('buyTokens - via transferFrom', () => {
    it('should allow a purchase', async () => {
      const value = 10;

      const preBalanceP = await this.token.balanceOf(purchaser);
      assert.equal(preBalanceP.toNumber(), 0, 'Purchaser should start with 0 tokens');

      const preBalanceO = await this.token.balanceOf(owner);
      assert.equal(preBalanceO.toNumber(), initialSupply, `Owner should start with ${initialSupply} tokens`);

      const preEth = await web3.eth.getBalance(owner);

      const buyTokens = await this.crowdsale.buyTokens(
        purchaser,
        {
          from: purchaser,
          value,
        },
      );

      const buyEvent = buyTokens.logs[buyTokens.logs.length - 1];
      assert.strictEqual(buyEvent.event, 'TokenPurchase', 'token purchase not successful');

      const postBalanceP = await this.token.balanceOf.call(purchaser);
      assert.strictEqual(postBalanceP.toNumber(), value);

      const postBalanceO = await this.token.balanceOf(owner);
      assert.equal(postBalanceO.toNumber(), initialSupply - value, `Owner should end with ${initialSupply - value} tokens`);

      const postEth = await web3.eth.getBalance(owner);
      assert.strictEqual(postEth.toNumber(), preEth.toNumber() + value);
    });
  });
});
