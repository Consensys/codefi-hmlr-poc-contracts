/* eslint max-len:0 */
const MeridioCrowdsaleAbstraction = artifacts.require('MeridioCrowdsale');
const AssetTokenAbstraction = artifacts.require('AssetToken');

const { latestTime } = require('openzeppelin-solidity/test/helpers/latestTime');
const { advanceBlock } = require('openzeppelin-solidity/test/helpers/advanceToBlock');
const { duration } = require('openzeppelin-solidity/test/helpers/increaseTime');
const { expectThrow } = require('../../utils');

contract('MeridioCrowdSale - updateRate', function (accounts) {
  const owner = accounts[0];
  const nonOwner = accounts[1];

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

  describe('is Ownable', () => {
    it('should set the owner', async () => {
      const setOwner = await this.crowdsale.owner.call();
      assert.strictEqual(setOwner, owner);
    });
  });

  describe('.updateRate', () => {
    it('should allow owner to updateRate', async () => {
      const newRate = 10;

      const updateRate = await this.crowdsale.updateRate(
        newRate,
        {
          from: owner,
        },
      );

      const updateEvent = updateRate.logs[updateRate.logs.length - 1];
      assert.strictEqual(updateEvent.event, 'RateUpdated', 'updateRate not successful');

      const postRate = await this.crowdsale.rate.call();
      assert.strictEqual(postRate.toNumber(), newRate);
    });
  });

  it('does not allow non-owner to change rate', async () => {
    const errMsg = 'It should not allow a non-owner to change rate';
    await expectThrow(
      this.crowdsale.updateRate(10, { from: nonOwner }),
      errMsg,
    );
  });
});
