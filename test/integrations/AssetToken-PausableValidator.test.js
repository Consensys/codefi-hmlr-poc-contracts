/* eslint max-len:0 */
const expectThrow = require('../utils.js').expectThrow;

const PausableValidator = artifacts.require('./PausableValidator.sol');
const AssetToken = artifacts.require('./AssetToken.sol');

contract('AssetToken-PausableValidator', (accounts) => {
  const owner = accounts[0];
  const newOwner = accounts[1];
  const approvedOwner = accounts[2];
  let AT;
  let PV;

  const initialSupply = 100000;
  const tokenName = 'ABC Property';
  const decimalUnits = 18;
  const tokenSymbol = 'ABC';

  beforeEach(async () => {
    AT = await AssetToken.new({ from: owner });
    await AT.initialize(
      owner,
      initialSupply,
      tokenName,
      decimalUnits,
      tokenSymbol,
      { from: owner },
    );

    PV = await PausableValidator.new(
      { from: owner },
    );
    await AT.addModule(
      PV.address,
      { from: owner },
    );
  });

  describe('.canSend()', () => {
    it('should report valid when unpaused', async () => {
      const errMsg = 'Should report true when unpaused';
      const value = 10;
      const state = await PV.paused();
      assert.isFalse(state, 'should start unpaused');

      const result = await AT.canSend.call(owner, newOwner, value);
      assert.isTrue(result, errMsg);
    });

    it('should report invalid when paused', async () => {
      const errMsg = 'Should report false when paused';
      const value = 10;
      await PV.pause({ from: owner });
      const state = await PV.paused();
      assert.isTrue(state, 'test should start paused');

      const result = await AT.canSend.call(owner, newOwner, value);
      assert.isFalse(result, errMsg);
    });
  });

  describe('.transfer()', () => {
    it('should allow transfers when unpaused', async () => {
      const value = 10;
      const state = await PV.paused();
      assert.isFalse(state);

      const result = await AT.transfer(newOwner, value, { from: owner });
      const transferEvent = result.logs[result.logs.length - 1];

      assert.strictEqual('Transfer', transferEvent.event);
      assert.strictEqual(owner, transferEvent.args.from);
      assert.strictEqual(newOwner, transferEvent.args.to);
      assert.strictEqual(value, transferEvent.args.value.toNumber());
    });

    it('should not allow transfers when paused', async () => {
      const value = 10;
      await PV.pause({ from: owner });
      const state = await PV.paused();
      assert.isTrue(state);

      await expectThrow(
        AT.transfer(newOwner, value, { from: owner }),
      );
    });

    it('should transfer when paused module is removed', async () => {
      const value = 10;
      const MODULE_TYPE = 1;
      await PV.pause({ from: owner });
      const state = await PV.paused();
      assert.isTrue(state);

      await AT.removeModule(MODULE_TYPE, 0);

      const result = await AT.transfer(newOwner, value, { from: owner });
      const transferEvent = result.logs[result.logs.length - 1];

      assert.strictEqual('Transfer', transferEvent.event);
      assert.strictEqual(owner, transferEvent.args.from);
      assert.strictEqual(newOwner, transferEvent.args.to);
      assert.strictEqual(value, transferEvent.args.value.toNumber());
    });

    it('should transfer when modules are added and removed', async () => {
      const value = 10;
      const MODULE_TYPE = 1;

      const PV2 = await PausableValidator.new(
        { from: owner },
      );
      await AT.addModule(
        PV2.address,
        { from: owner },
      );

      const PV3 = await PausableValidator.new(
        { from: owner },
      );
      await AT.addModule(
        PV3.address,
        { from: owner },
      );

      await AT.removeModule(MODULE_TYPE, 1);

      const PV4 = await PausableValidator.new(
        { from: owner },
      );
      await AT.addModule(
        PV4.address,
        { from: owner },
      );

      await AT.removeModule(MODULE_TYPE, 0);

      const PV5 = await PausableValidator.new(
        { from: owner },
      );
      await AT.addModule(
        PV5.address,
        { from: owner },
      );

      const result = await AT.transfer(newOwner, value, { from: owner });
      const transferEvent = result.logs[result.logs.length - 1];

      assert.strictEqual('Transfer', transferEvent.event);
      assert.strictEqual(owner, transferEvent.args.from);
      assert.strictEqual(newOwner, transferEvent.args.to);
      assert.strictEqual(value, transferEvent.args.value.toNumber());
    });
  });

  describe('.transferFrom()', () => {
    it('should allow transferFroms when unpaused', async () => {
      const value = 10;
      const state = await PV.paused();
      assert.isFalse(state);

      await AT.approve(approvedOwner, value, { from: owner });

      const result = await AT.transferFrom(
        owner,
        newOwner,
        value,
        { from: approvedOwner },
      );
      const transferEvent = result.logs[result.logs.length - 1];

      assert.strictEqual('Transfer', transferEvent.event);
      assert.strictEqual(owner, transferEvent.args.from);
      assert.strictEqual(newOwner, transferEvent.args.to);
      assert.strictEqual(value, transferEvent.args.value.toNumber());
    });

    it('should not allow transferFroms when paused', async () => {
      const value = 10;
      await PV.pause({ from: owner });
      const state = await PV.paused();
      assert.isTrue(state);

      await AT.approve(approvedOwner, value, { from: owner });

      await expectThrow(
        AT.transferFrom(owner, newOwner, value, { from: approvedOwner }),
      );
    });
  });
});
