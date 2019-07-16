const MeridioCrowdsaleAbstraction = artifacts.require('MeridioCrowdsale');
const AssetTokenAbstraction = artifacts.require('AssetToken');

const { latestTime } = require('openzeppelin-solidity/test/helpers/latestTime');
const { advanceBlock } = require('openzeppelin-solidity/test/helpers/advanceToBlock');
const { duration } = require('openzeppelin-solidity/test/helpers/increaseTime');
const expectThrow = require('../../utils.js').expectThrow;

contract('MeridioCrowdSale - constructor', function (accounts) {
  const owner = accounts[0];
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

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

    this.openingTime = (await latestTime()) + duration.weeks(1);
    this.closingTime = this.openingTime + duration.weeks(1);

    this.crowdsale = await MeridioCrowdsaleAbstraction.new(
      this.openingTime,
      this.closingTime,
      rate,
      this.token.address,
      { from: owner },
    );
  });

  describe('constructor', () => {
    it('should create with the correct information', async () => {
      const setOwner = await this.crowdsale.owner.call();
      assert.strictEqual(setOwner, owner);

      const wallet = await this.crowdsale.wallet.call();
      assert.strictEqual(wallet, wallet);

      const isPaused = await this.crowdsale.paused.call();
      assert.isFalse(isPaused);

      const setRate = await this.crowdsale.rate.call();
      assert.strictEqual(setRate.toNumber(), rate);

      const weiRaised = await this.crowdsale.weiRaised.call();
      assert.strictEqual(weiRaised.toNumber(), 0);

      const openingTime = await this.crowdsale.openingTime.call();
      assert.strictEqual(openingTime.toNumber(), this.openingTime);

      const closingTime = await this.crowdsale.closingTime.call();
      assert.strictEqual(closingTime.toNumber(), this.closingTime);
    });

    it('it should not be able to create with openingTime of 0', async () => {
      const errMsg = 'It should throw when trying to create with openingTime of 0';
      await expectThrow(
        MeridioCrowdsaleAbstraction.new(
          0, // this.openingTime
          this.closingTime,
          rate,
          this.token.address, // token address
          { from: owner },
        ),
        errMsg,
      );
    });

    it('it should not be able to create with closingTime of 0', async () => {
      const errMsg = 'It should throw when trying to create with closingTime of 0';
      await expectThrow(
        MeridioCrowdsaleAbstraction.new(
          this.openingTime,
          0, // this.closingTime
          rate,
          this.token.address, // token address
          { from: owner },
        ),
        errMsg,
      );
    });

    it('it should not be able to create with rate of 0', async () => {
      const errMsg = 'It should throw when trying to create with rate of 0';
      await expectThrow(
        MeridioCrowdsaleAbstraction.new(
          this.openingTime,
          this.closingTime,
          0, // rate
          this.token.address,
          { from: owner },
        ),
        errMsg,
      );
    });

    it('rejects an opening time in the past', async () => {
      const errMsg = 'It should throw when trying to create with opening time in past';
      await expectThrow(
        MeridioCrowdsaleAbstraction.new(
          (await latestTime()) - duration.days(1),
          this.closingTime,
          rate,
          this.token.address,
          { from: owner },
        ),
        errMsg,
      );
    });

    it('rejects a closing time before the opening time', async () => {
      const errMsg = 'It should throw when trying to create with closing time before opening time';
      await expectThrow(
        MeridioCrowdsaleAbstraction.new(
          this.openingTime,
          this.openingTime - duration.seconds(1),
          rate,
          this.token.address,
          { from: owner },
        ),
        errMsg,
      );
    });

    it(`it should not be able to create with token of ${ZERO_ADDRESS}`, async () => {
      const errMsg = `It should throw when trying to create with token of ${ZERO_ADDRESS}`;
      await expectThrow(
        MeridioCrowdsaleAbstraction.new(
          this.openingTime,
          this.closingTime,
          rate,
          ZERO_ADDRESS, // token address
          { from: owner },
        ),
        errMsg,
      );
    });
  });
});
