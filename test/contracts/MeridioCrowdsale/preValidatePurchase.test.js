/* eslint max-len:0 */
const MeridioCrowdsaleAbstraction = artifacts.require('MeridioCrowdsale');
const AssetTokenAbstraction = artifacts.require('AssetToken');
const WhitelistValidator = artifacts.require('WhitelistValidator');
const PausableValidator = artifacts.require('PausableValidator');

const { latestTime } = require('openzeppelin-solidity/test/helpers/latestTime');
const { advanceBlock } = require('openzeppelin-solidity/test/helpers/advanceToBlock');
const { duration } = require('openzeppelin-solidity/test/helpers/increaseTime');
const { expectThrow } = require('../../utils.js');

contract('MeridioCrowdSale - preValidatePurchase', function (accounts) {
  const owner = accounts[0];
  const purchaser = accounts[1];
  const badAddress = accounts[2];

  // variables to launch Crowdsale
  const rate = 1;

  // variables to launch AssetToken
  const initialSupply = 100000;
  const tokenName = 'ABC Property';
  const decimalUnits = 18;
  const tokenSymbol = 'ABC';

  beforeEach(async () => {
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

    this.openingTime = await latestTime();
    this.closingTime = this.openingTime + duration.weeks(1);
    this.crowdsale = await MeridioCrowdsaleAbstraction.new(
      this.openingTime,
      this.closingTime,
      rate,
      this.token.address,
      { from: owner },
    ).catch(e => {
      console.log('error launching crowdsale, most likely due to time control in testing');
      console.log('opening time', this.openingTime);
      console.log('closing time', this.closingTime);
      throw e;
    });

    await this.token.approve(this.crowdsale.address, initialSupply, { from: owner });
  });

  describe('_preValidatePurchase - Whitelist Validator', () => {
    beforeEach(async () => {
      this.whitelist = await WhitelistValidator.new({ from: owner });

      await this.token.addModule(
        this.whitelist.address,
        { from: owner },
      );
    });

    it('should allow a purchase to whitelisted address', async () => {
      const value = 10;

      await this.whitelist.addAddress(purchaser, { from: owner });
      const isAdded = await this.whitelist.isWhitelisted(purchaser);
      assert.isTrue(isAdded, 'Purchaser address not properly added');

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

    it('it should not allow a purchase to non-whitelisted address', async () => {
      const errMsg = 'It should throw when non-whitelisted address is trying to purchase';
      const value = 10;

      const isAdded = await this.whitelist.isWhitelisted(badAddress);
      assert.isFalse(isAdded, 'Purchaser address not properly added');

      await expectThrow(
        this.crowdsale.buyTokens(
          badAddress,
          {
            from: badAddress,
            value,
          },
        ),
        errMsg,
      );
    });
  });

  describe('_preValidatePurchase - Pausable Validator', () => {
    beforeEach(async () => {
      this.pausable = await PausableValidator.new({ from: owner });

      await this.token.addModule(
        this.pausable.address,
        { from: owner },
      );
    });

    it('should allow a purchase when token not paused', async () => {
      const value = 10;

      const isPaused = await this.pausable.paused();
      assert.isFalse(isPaused, 'should not be paused');

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

    it('it should not allow a purchase when paused', async () => {
      const errMsg = 'It should throw when token is paused';
      const value = 10;

      await this.pausable.pause({ from: owner });

      const isPaused = await this.pausable.paused();
      assert.isTrue(isPaused, 'should not be paused');
      await expectThrow(
        this.crowdsale.buyTokens(
          purchaser,
          {
            from: purchaser,
            value,
          },
        ),
        errMsg,
      );
    });
  });
});
