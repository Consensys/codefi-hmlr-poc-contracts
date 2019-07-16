/* eslint max-len:0 */
const isEVMException = require('../../utils').isEVMException;
const expectThrow = require('../../utils').expectThrow;

const SenderWhitelistValidatorAbstraction = artifacts.require('SenderWhitelistValidator');

contract('SenderWhitelistValidator', (accounts) => {
  const from = accounts[0];
  const investor1 = accounts[1];
  let instance;

  beforeEach(async () => {
    instance = await SenderWhitelistValidatorAbstraction.new({ from });
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
    const TRANSFER_VALIDATOR_NAME = 'SenderWhitelistValidator';

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
    it('allows owner to add new address to whitelist', async () => {
      const errMsg = 'Address not added';
      const receipt = await instance.addAddress(investor1, { from });
      const event = receipt.logs[0];
      const eventName = receipt.logs[0].event;
      assert.strictEqual(eventName, 'LogAddAddress');
      assert.strictEqual(event.args.sender, from);
      assert.strictEqual(event.args.nowOkay, investor1);
      const isWhitelisted = await instance.isWhitelisted.call(investor1);
      assert.isTrue(isWhitelisted, errMsg);
    });
    it('does not allow non-owner to add from whitelist', async () => {
      const errMsg = 'It should not allow a non-owner to add an address';
      const isWhitelisted = await instance.isWhitelisted.call(investor1);
      assert.isFalse(isWhitelisted, 'Should not already be on the whitelist');
      try {
        await instance.addAddress(investor1, { from: investor1 });
      } catch (e) {
        assert.isTrue(isEVMException(e), errMsg);
        return;
      }
      assert.fail('Expected throw not received');
    });
    it('does not add an address twice', async () => {
      const errMsg = 'It should not allow adding address twice';
      await instance.addAddress(investor1, { from });
      const isWhitelisted = await instance.isWhitelisted.call(investor1);
      assert.isTrue(isWhitelisted, 'Should be on the whitelist');
      try {
        await instance.addAddress(investor1, { from });
      } catch (e) {
        assert.isTrue(isEVMException(e), errMsg);
        return;
      }
      assert.fail('Expected throw not received');
    });
    it('does not add a 0 address', async () => {
      const errMsg = 'It should not allow adding 0 address';
      try {
        await instance.addAddress(0, { from });
      } catch (e) {
        assert.isTrue(isEVMException(e), errMsg);
        return;
      }
      assert.fail('Expected throw not received');
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
    it('allows owner to remove an address from whitelist', async () => {
      const errMsg = 'Address not removed';

      await instance.addAddress(investor1, { from });
      const isWhitelisted = await instance.isWhitelisted.call(investor1);
      assert.isTrue(isWhitelisted, 'Should be on the whitelist');

      const receipt = await instance.removeAddress(investor1, { from });
      const event = receipt.logs[0];
      const eventName = receipt.logs[0].event;
      assert.strictEqual(eventName, 'LogRemoveAddress');
      assert.strictEqual(event.args.sender, from);
      assert.strictEqual(event.args.deleted, investor1);
      const afterStatus = await instance.isWhitelisted.call(investor1);
      assert.isFalse(afterStatus, errMsg);
    });
    it('does not allow non-owner to remove from whitelist', async () => {
      const errMsg = 'It should not allow a non-owner to add an address';

      await instance.addAddress(investor1, { from });
      const isWhitelisted = await instance.isWhitelisted.call(investor1);
      assert.isTrue(isWhitelisted, 'Should be on the whitelist');

      try {
        await instance.removeAddress(investor1, { from: investor1 });
      } catch (e) {
        assert.isTrue(isEVMException(e), errMsg);
        return;
      }
      assert.fail('Expected throw not received');
    });
    it('it throws when trying to remove an address not on the list', async () => {
      const errMsg = 'It should when trying to remove address not listed';

      const isWhitelisted = await instance.isWhitelisted.call(investor1);
      assert.isFalse(isWhitelisted, 'Should not be on the whitelist');
      try {
        await instance.removeAddress(investor1, { from });
      } catch (e) {
        assert.isTrue(isEVMException(e), errMsg);
        return;
      }
      assert.fail('Expected throw not received');
    });
    it('it does not remove address when paused', async () => {
      const errMsg = 'It should not allow removing address when paused';

      await instance.addAddress(investor1, { from });
      const isWhitelisted = await instance.isWhitelisted.call(investor1);
      assert.isTrue(isWhitelisted, 'Should be on the whitelist');

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
    it('it returns true when the _from address is whitelisted', async () => {
      const errMsg = 'It should report true for valid address';
      await instance.addAddress(from);
      const result = await instance.canSend.call(
        0x00,
        from,
        0x00,
        0,
      );
      assert.isTrue(result, errMsg);
    });
    it('it returns true even when the _to address is not whitelisted', async () => {
      const errMsg = 'It should report true for valid _to address';
      await instance.addAddress(from);
      const isWhitelisted = await instance.isWhitelisted.call(investor1);
      assert.isFalse(isWhitelisted, 'Should not be on the whitelist');
      const result = await instance.canSend.call(
        0x00,
        from,
        investor1,
        0,
      );
      assert.isTrue(result, errMsg);
    });
    it('it returns false when the _from address is not whitelisted', async () => {
      const errMsg = 'It should report false for invalid address';
      const isWhitelisted = await instance.isWhitelisted.call(from);
      assert.isFalse(isWhitelisted, 'Should not be on the whitelist');

      const result = await instance.canSend.call(
        0x00,
        from,
        0x00,
        0,
      );
      assert.isFalse(result, errMsg);
    });
  });
});
