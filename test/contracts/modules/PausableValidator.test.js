const isEVMException = require('../../utils').isEVMException;

const PausableValidator = artifacts.require('PausableValidator');

contract('PausableValidator', (accounts) => {
  const owner = accounts[0];
  const nonOwner = accounts[1];

  let instance;

  beforeEach(async () => {
    instance = await PausableValidator.new({ from: owner });
  });

  describe('initial state', () => {
    it('it should initialize unpaused', async () => {
      const errMsg = 'Should report valid (true) when not paused';
      const paused = await instance.paused.call();
      assert.isFalse(paused, errMsg);
    });
  });

  describe('.pause()', () => {
    it('it should allow owner to pause instance', async () => {
      const errMsg = 'Should allow owner to pause instance';
      await instance.pause({ from: owner });
      const paused = await instance.paused.call();
      assert.isTrue(paused, errMsg);
    });

    it('it should not allow non-owner to pause instance', async () => {
      const errMsg = 'Should not allow non-owner to pause instance';
      try {
        await instance.pause({ from: nonOwner });
      } catch (e) {
        assert.isTrue(isEVMException(e), errMsg);
        const paused = await instance.paused.call();
        assert.isFalse(paused, errMsg);
        return;
      }
      assert.fail('Expected throw not received');
    });

    it('it should reject pause if already paused', async () => {
      const errMsg = 'Should reject pause if already paused';
      await instance.pause({ from: owner });
      const paused = await instance.paused.call();
      assert.isTrue(paused, 'Should started paused');
      try {
        await instance.pause({ from: nonOwner });
      } catch (e) {
        assert.isTrue(isEVMException(e), errMsg);
        const paused = await instance.paused.call();
        assert.isTrue(paused, errMsg);
        return;
      }
      assert.fail('Expected throw not received');
    });
  });

  describe('.unpause()', () => {
    const errStartState = 'Should start paused';

    beforeEach(async () => {
      await instance.pause({ from: owner });
    });

    it('it should allow owner to unpause instance', async () => {
      const errMsg = 'Should allow owner to unpause instance';
      const start = await instance.paused.call();
      assert.isTrue(start, errStartState);

      await instance.unpause({ from: owner });
      const isPaused = await instance.paused.call();
      assert.isFalse(isPaused, errMsg);
    });

    it('it should not allow non-owner to unpause instance', async () => {
      const errMsg = 'Should not allow non-owner to unpause instance';
      const start = await instance.paused.call();
      assert.isTrue(start, errStartState);

      try {
        await instance.unpause({ from: nonOwner });
      } catch (e) {
        assert.isTrue(isEVMException(e), errMsg);
        const paused = await instance.paused.call();
        assert.isTrue(paused, errMsg);
        return;
      }
      assert.fail('Expected throw not received');
    });

    it('it should reject unpause if not paused', async () => {
      const errMsg = 'Should reject unpause if not paused';
      const start = await instance.paused.call();
      assert.isTrue(start, errStartState);
      await instance.unpause({ from: owner });
      const isNotPaused = await instance.paused.call();
      assert.isFalse(isNotPaused, 'Should be unpaused');

      try {
        await instance.unpause({ from: nonOwner });
      } catch (e) {
        assert.isTrue(isEVMException(e), errMsg);
        const paused = await instance.paused.call();
        assert.isFalse(paused, errMsg);
        return;
      }
      assert.fail('Expected throw not received');
    });
  });

  describe('.canSend()', () => {
    it('returns valid (true) when not paused', async () => {
      const errMsg = 'Should report valid (true) when not paused';
      const beforePaused = await instance.paused.call();
      assert.isFalse(beforePaused);

      const result = await instance.canSend.call(
        0x00,
        0x00,
        0x00,
        0,
      );

      assert.isTrue(result, errMsg);
    });

    it('returns invalid (false) when paused', async () => {
      const errMsg = 'Should report invalid (false) when paused';
      await instance.pause({ from: owner });
      const state = await instance.paused();
      assert.isTrue(state);

      const result = await instance.canSend.call(
        0x00,
        0x00,
        0x00,
        0,
      );

      assert.isFalse(result, errMsg);
    });
  });

  describe('.getName()', () => {
    const TRANSFER_VALIDATOR_NAME = 'PausableValidator';

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
});
