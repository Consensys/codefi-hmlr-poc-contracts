/* eslint max-len:0 */
const { advanceBlock } = require('openzeppelin-solidity/test/helpers/advanceToBlock');
const { increaseTimeTo, duration } = require('openzeppelin-solidity/test/helpers/increaseTime');
const { latestTime } = require('openzeppelin-solidity/test/helpers/latestTime');
const { expectThrow } = require('../../utils');

const LockUpPeriodValidatorAbstraction = artifacts.require('LockUpPeriodValidator');

contract('LockUpPeriodValidator', function (accounts) {
  const from = accounts[0];
  const investor1 = accounts[1];
  let instance;

  before(async () => {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
    await advanceBlock();
  });

  beforeEach(async () => {
    this.openingTime = (await latestTime()) + duration.weeks(1);
    instance = await LockUpPeriodValidatorAbstraction.new(this.openingTime, { from });
  });

  describe('constructor', () => {
    it('does not allow owner to change openingTime to less than block.timestamp', async () => {
      const errMsg = 'Should throw error for less than now openingTime';
      const beforeNowTime = (await latestTime()) - duration.minutes(1);
      await expectThrow(
        LockUpPeriodValidatorAbstraction.new(beforeNowTime, { from }),
        errMsg,
      );
    });
  });

  describe('is Ownable', () => {
    it('should set the owner', async () => {
      const owner = await instance.owner.call();
      assert.strictEqual(owner, from);
    });
  });

  describe('is Pausable', () => {
    it('should set to unpaused', async () => {
      const paused = await instance.paused.call();
      assert.strictEqual(paused, false, 'should start unpaused');
    });
  });

  describe('.getName()', () => {
    const TRANSFER_VALIDATOR_NAME = 'LockUpPeriodValidator';

    it('should get the correct name', async () => {
      const name = await instance.getName.call();
      assert.strictEqual(
        TRANSFER_VALIDATOR_NAME,
        web3._extend.utils.toAscii(name).replace(/\0/g, ''),
      );
    });
  });

  describe('.getType()', () => {
    const TRANSFER_VALIDATOR_TYPE = 1;

    it('should get the correct type', async () => {
      const type = await instance.getType.call();
      assert.strictEqual(TRANSFER_VALIDATOR_TYPE, type.toNumber());
    });
  });

  describe('.openingTime()', () => {
    it('should get the correct openingTime', async () => {
      const setOpeningTime = await instance.openingTime.call();
      assert.strictEqual(setOpeningTime.toNumber(), this.openingTime);
    });
  });

  describe('.setOpeningTime()', async () => {
    beforeEach(async () => {
      this.newOpeningTime = (await latestTime()) + duration.weeks(1);
    });

    it('allows owner to change openingTime', async () => {
      const errMsg = 'OpeningTime not changed';
      const receipt = await instance.setOpeningTime(this.newOpeningTime, { from });
      const event = receipt.logs[0];
      const eventName = receipt.logs[0].event;
      assert.strictEqual(eventName, 'LogSetOpeningTime');
      assert.strictEqual(event.args.sender, from);
      assert.strictEqual(event.args.newOpeningTime.toNumber(), this.newOpeningTime);
      const setOpeningTime = await instance.openingTime.call();
      assert.equal(setOpeningTime.toNumber(), this.newOpeningTime, errMsg);
    });

    it('allows owner to change openingTime to equal to block.timestamp', async () => {
      const errMsg = 'OpeningTime not changed';
      const blockTimestamp = await latestTime();
      const receipt = await instance.setOpeningTime(blockTimestamp, { from });
      const event = receipt.logs[0];
      const eventName = receipt.logs[0].event;
      assert.strictEqual(eventName, 'LogSetOpeningTime');
      assert.strictEqual(event.args.sender, from);
      assert.strictEqual(event.args.newOpeningTime.toNumber(), blockTimestamp);
      const setOpeningTime = await instance.openingTime.call();
      assert.equal(setOpeningTime.toNumber(), blockTimestamp, errMsg);
    });

    it('does not allow non-owner to change openingTime', async () => {
      const errMsg = 'It should not allow a non-owner to change openingTime';
      await expectThrow(
        instance.setOpeningTime(this.newOpeningTime, { from: investor1 }),
        errMsg,
      );
    });

    it('does not change OpeningTime when paused', async () => {
      const errMsg = 'It should not allow changing OpeningTime when paused';
      await instance.pause({ from });
      const paused = await instance.paused.call();
      assert.strictEqual(paused, true, 'should be paused');
      await expectThrow(
        instance.setOpeningTime(this.newOpeningTime, { from }),
        errMsg,
      );
    });

    it('does not allow owner to change openingTime to less than block.timestamp', async () => {
      const errMsg = 'Should throw error for less than now openingTime';
      const beforeNowTime = (await latestTime()) - duration.minutes(1);
      await expectThrow(
        instance.setOpeningTime(beforeNowTime, { from }),
        errMsg,
      );
    });
  });

  describe('.canSend()', async () => {
    it('it returns false when openingTime is in the future', async () => {
      const errMsg = 'It should report false for openingTime in the future';
      const nowTime = await latestTime();
      assert.isAbove(this.openingTime, nowTime);
      const result = await instance.canSend.call(
        '0x00',
        '0x00',
        '0x00',
        '0x00',
      );
      assert.isFalse(result, errMsg);
    });

    it('it returns true when openingTime is in the past', async () => {
      const futureTime = this.openingTime + duration.days(1);
      assert.isAbove(futureTime, this.openingTime);
      await increaseTimeTo(futureTime);
      const errMsg = 'It should report true for openingTime in the past';
      const result = await instance.canSend.call(
        '0x00',
        '0x00',
        '0x00',
        '0x00',
      );
      assert.isTrue(result, errMsg);
    });
    it('it returns true when openingTime is now', async () => {
      await increaseTimeTo(this.openingTime);
      const errMsg = 'It should report true for openingTime is now';
      const result = await instance.canSend.call(
        '0x00',
        '0x00',
        '0x00',
        '0x00',
      );
      assert.isTrue(result, errMsg);
    });
  });
});
