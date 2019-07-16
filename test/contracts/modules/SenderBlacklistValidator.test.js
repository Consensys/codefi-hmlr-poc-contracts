/* eslint max-len:0 */
const { expectThrow } = require('../../utils');

const SenderBlacklistValidatorAbstraction = artifacts.require('SenderBlacklistValidator');

contract('SenderBlacklistValidator', (accounts) => {
  const from = accounts[0];
  const investor1 = accounts[1];
  let instance;

  beforeEach(async () => {
    instance = await SenderBlacklistValidatorAbstraction.new({ from });
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
    const TRANSFER_VALIDATOR_NAME = 'SenderBlacklistValidator';

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

  describe('.addAddress()', async () => {
    it('allows owner to add new address to blacklist', async () => {
      const errMsg = 'Address not added';
      const receipt = await instance.addAddress(investor1, { from });
      const event = receipt.logs[0];
      const eventName = receipt.logs[0].event;
      assert.strictEqual(eventName, 'LogAddAddress');
      assert.strictEqual(event.args.sender, from);
      assert.strictEqual(event.args.nowOkay, investor1);
      const isBlacklisted = await instance.isBlacklisted.call(investor1);
      assert.isTrue(isBlacklisted, errMsg);
    });
    it('does not allow non-owner to add from blacklist', async () => {
      const errMsg = 'It should not allow a non-owner to add an address';
      const isBlacklisted = await instance.isBlacklisted.call(investor1);
      assert.isFalse(isBlacklisted, 'Should not already be on the blacklist');
      await expectThrow(
        instance.addAddress(investor1, { from: investor1 }),
        errMsg,
      );
    });
    it('does not add an address twice', async () => {
      const errMsg = 'It should not allow adding address twice';
      await instance.addAddress(investor1, { from });
      const isBlacklisted = await instance.isBlacklisted.call(investor1);
      assert.isTrue(isBlacklisted, 'Should be on the blacklist');
      await expectThrow(
        instance.addAddress(investor1, { from }),
        errMsg,
      );
    });
    it('does not add a 0 address', async () => {
      const errMsg = 'It should not allow adding 0 address';
      await expectThrow(
        instance.addAddress(0, { from }),
        errMsg,
      );
    });
    it('does not add address when paused', async () => {
      const errMsg = 'It should not allow adding address when paused';
      await instance.pause({ from });
      const paused = await instance.paused.call();
      assert.strictEqual(paused, true, 'should be paused');
      await expectThrow(
        instance.addAddress(investor1, { from }),
        errMsg,
      );
    });
  });

  describe('.removeAddress()', async () => {
    it('allows owner to remove an address from blacklist', async () => {
      const errMsg = 'Address not removed';

      await instance.addAddress(investor1, { from });
      const isBlacklisted = await instance.isBlacklisted.call(investor1);
      assert.isTrue(isBlacklisted, 'Should be on the blacklist');

      const receipt = await instance.removeAddress(investor1, { from });
      const event = receipt.logs[0];
      const eventName = receipt.logs[0].event;
      assert.strictEqual(eventName, 'LogRemoveAddress');
      assert.strictEqual(event.args.sender, from);
      assert.strictEqual(event.args.deleted, investor1);
      const afterStatus = await instance.isBlacklisted.call(investor1);
      assert.isFalse(afterStatus, errMsg);
    });
    it('does not allow non-owner to remove from blacklist', async () => {
      const errMsg = 'It should not allow a non-owner to add an address';

      await instance.addAddress(investor1, { from });
      const isBlacklisted = await instance.isBlacklisted.call(investor1);
      assert.isTrue(isBlacklisted, 'Should be on the blacklist');

      await expectThrow(
        instance.removeAddress(investor1, { from: investor1 }),
        errMsg,
      );
    });
    it('it throws when trying to remove an address not on the list', async () => {
      const errMsg = 'It should when trying to remove address not listed';

      const isBlacklisted = await instance.isBlacklisted.call(investor1);
      assert.isFalse(isBlacklisted, 'Should not be on the blacklist');
      await expectThrow(
        instance.removeAddress(investor1, { from }),
        errMsg,
      );
    });
    it('it does not remove address when paused', async () => {
      const errMsg = 'It should not allow removing address when paused';

      await instance.addAddress(investor1, { from });
      const isBlacklisted = await instance.isBlacklisted.call(investor1);
      assert.isTrue(isBlacklisted, 'Should be on the blacklist');

      await instance.pause({ from });
      const paused = await instance.paused.call();
      assert.strictEqual(paused, true, 'should be paused');

      await expectThrow(
        instance.removeAddress(investor1, { from }),
        errMsg,
      );
    });
  });

  describe('.canSend()', async () => {
    it('it returns false when the _from address is blacklisted', async () => {
      const errMsg = 'It should report false for blacklisted address';
      await instance.addAddress(from);
      const result = await instance.canSend.call(
        0x00,
        from,
        0x00,
        0,
      );
      assert.isFalse(result, errMsg);
    });
    it('it returns false even when the _to address is not blacklisted', async () => {
      const errMsg = 'It should report false for not blacklisted _to address';
      await instance.addAddress(from);
      const isBlacklisted = await instance.isBlacklisted.call(investor1);
      assert.isFalse(isBlacklisted, 'Should not be on the blacklist');
      const result = await instance.canSend.call(
        0x00,
        from,
        investor1,
        0,
      );
      assert.isFalse(result, errMsg);
    });
    it('it returns true when the _from address is not blacklisted', async () => {
      const errMsg = 'It should report true for not blacklisted from address';
      const isBlacklisted = await instance.isBlacklisted.call(from);
      assert.isFalse(isBlacklisted, 'Should not be on the blacklist');

      const result = await instance.canSend.call(
        0x00,
        from,
        0x00,
        0,
      );
      assert.isTrue(result, errMsg);
    });

    it('it returns true when the _from address is not blacklisted even when the to address is blacklisted', async () => {
      const errMsg = 'It should report true for not blacklisted from address and blacklisted to address';
      const isBlacklisted = await instance.isBlacklisted.call(from);
      assert.isFalse(isBlacklisted, 'Should not be on the blacklist');
      await instance.addAddress(investor1);
      const isBlacklistedTo = await instance.isBlacklisted.call(investor1);
      assert.isTrue(isBlacklistedTo, 'Should not be on the blacklist');

      const result = await instance.canSend.call(
        0x00,
        from,
        investor1,
        0,
      );
      assert.isTrue(result, errMsg);
    });
  });
});
