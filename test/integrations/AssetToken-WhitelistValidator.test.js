/* eslint max-len:0 */
const expectThrow = require('../utils.js').expectThrow;

const WhitelistValidator = artifacts.require('./WhitelistValidator.sol');
const AssetToken = artifacts.require('./AssetToken.sol');

contract('AssetToken-WhitelistValidator', (accounts) => {
  const owner = web3.eth.accounts[0];
  const receiver0 = web3.eth.accounts[1];
  const receiver1 = web3.eth.accounts[2];
  let AT;
  let WV;

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
    WV = await WhitelistValidator.new(
      { from: owner },
    );
    await AT.addModule(
      WV.address,
      { from: owner },
    );
  });
  describe('.transfer()', () => {
    it('should allow transfer when recipient is on whitelist', async () => {
      const value = 10;
      const added = await WV.addAddress(receiver0, { from: owner });
      const addEvent = added.logs[added.logs.length - 1];
      assert.strictEqual(addEvent.event, 'LogAddAddress', 'new address could not be added to whitelist');
      const transfer = await AT.transfer(receiver0, value, { from: owner });
      const transferEvent = transfer.logs[transfer.logs.length - 1];
      assert.strictEqual('Transfer', transferEvent.event);
      assert.strictEqual(owner, transferEvent.args.from);
      assert.strictEqual(receiver0, transferEvent.args.to);
      assert.strictEqual(value, transferEvent.args.value.toNumber());
    });
    it('should not allow transfers when recipient is not on whitelist', async () => {
      const notOnWhitelist = await WV.isWhitelisted(receiver0, { from: owner });
      assert.isFalse(notOnWhitelist, 'Recipient should not be on whitelist');
      expectThrow(AT.transfer(receiver0, 4, { from: owner }));
    });
    it('should not allow transfers when recipient is removed from whitelist', async () => {
      const value = 10;
      await WV.addAddress(receiver0);
      const isOnWhitelist = await WV.isWhitelisted(receiver0, { from: owner });
      assert.isTrue(isOnWhitelist, 'receipient address is on whitelist');

      const removed = await WV.removeAddress(receiver0, { from: owner });
      const removalEvent = removed.logs[removed.logs.length - 1].event;
      assert.strictEqual(removalEvent, 'LogRemoveAddress', 'new address could not be removed from whitelist');

      expectThrow(AT.transfer(receiver0, value, { from: owner }));
    });
    it('should allow transfer after whitelist module is removed', async () => {
      const value = 10;
      const MODULE_TYPE = 1;

      const notOnWhitelist = await WV.isWhitelisted(receiver0, { from: owner });
      assert.isFalse(notOnWhitelist, 'Recipient should not be on whitelist');

      const startBalance = await AT.balanceOf.call(receiver0);
      assert.equal(startBalance.toNumber(), 0);

      await AT.removeModule(MODULE_TYPE, 0);

      const result = await AT.transfer(receiver0, value, { from: owner });
      const transferEvent = result.logs[result.logs.length - 1];

      assert.strictEqual('Transfer', transferEvent.event);
      assert.strictEqual(owner, transferEvent.args.from);
      assert.strictEqual(receiver0, transferEvent.args.to);
      assert.strictEqual(value, transferEvent.args.value.toNumber());

      const receiverBalance = await AT.balanceOf.call(receiver0);
      assert.equal(receiverBalance.toNumber(), value);
    });
  });
  describe('.transferFrom()', () => {
    it('should allow transferFrom() to a whitelisted address', async () => {
      const value = 10;
      await WV.addAddress(receiver1);
      await AT.approve(receiver0, value, { from: owner });
      const receipt = await AT.transferFrom(owner, receiver1, value, { from: receiver0 });
      const transferFromEvent = receipt.logs[receipt.logs.length - 1];
      const balance = await AT.balanceOf(receiver1);
      assert.strictEqual(transferFromEvent.event, 'Transfer');
      assert.strictEqual(balance.toNumber(), value, 'receiver 1\'s balance does not equal transferFrom amount');
    });
    it('should fail when transferFrom() is called to a non-whitelisted address', async () => {
      const value = 10;
      const isWhitelisted = await WV.isWhitelisted(receiver1);
      assert.isFalse(isWhitelisted, 'remo');
      await AT.approve(receiver0, value, { from: owner });
      expectThrow(AT.transferFrom(owner, receiver1, value, { from: receiver0 }));
    });
    it('should not allow transferFrom when recipient is removed from whitelist', async () => {
      const value = 10;
      await WV.addAddress(receiver1);
      await AT.approve(receiver0, value, { from: owner });
      const isOnWhitelist = await WV.isWhitelisted(receiver1, { from: owner });
      assert.isTrue(isOnWhitelist, 'receipient address is on whitelist');

      const startBalance = await AT.balanceOf.call(receiver1);
      assert.equal(startBalance.toNumber(), 0);

      const result = await AT.transferFrom(owner, receiver1, value, { from: receiver0 });
      const transferEvent = result.logs[result.logs.length - 1];

      assert.strictEqual('Transfer', transferEvent.event);
      assert.strictEqual(owner, transferEvent.args.from);
      assert.strictEqual(receiver1, transferEvent.args.to);
      assert.strictEqual(value, transferEvent.args.value.toNumber());

      const receiverBalance = await AT.balanceOf.call(receiver1);
      assert.equal(receiverBalance.toNumber(), value);

      const removed = await WV.removeAddress(receiver1, { from: owner });
      const removalEvent = removed.logs[removed.logs.length - 1].event;
      assert.strictEqual(removalEvent, 'LogRemoveAddress', 'new address could not be removed from whitelist');

      await AT.approve(receiver0, value, { from: owner });
      const isOnWhitelist1 = await WV.isWhitelisted(receiver1, { from: owner });
      assert.isFalse(isOnWhitelist1, 'receipient address is not on whitelist');

      expectThrow(AT.transfer(receiver1, value, { from: owner }));

      const afterBalance = await AT.balanceOf.call(receiver1);
      assert.equal(afterBalance.toNumber(), value);
    });
    it('should allow transferFrom after whitelist module is removed', async () => {
      const value = 10;
      const MODULE_TYPE = 1;
      await AT.approve(receiver0, value, { from: owner });

      const notOnWhitelist = await WV.isWhitelisted(receiver1, { from: owner });
      assert.isFalse(notOnWhitelist, 'Recipient should not be on whitelist');

      const startBalance = await AT.balanceOf.call(receiver1);
      assert.equal(startBalance.toNumber(), 0);

      await AT.removeModule(MODULE_TYPE, 0);

      const result = await AT.transfer(receiver1, value, { from: owner });
      const transferEvent = result.logs[result.logs.length - 1];

      assert.strictEqual('Transfer', transferEvent.event);
      assert.strictEqual(owner, transferEvent.args.from);
      assert.strictEqual(receiver1, transferEvent.args.to);
      assert.strictEqual(value, transferEvent.args.value.toNumber());

      const receiverBalance = await AT.balanceOf.call(receiver1);
      assert.equal(receiverBalance.toNumber(), value);
    });
  });
});
