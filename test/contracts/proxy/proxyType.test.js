/* eslint max-len:0 */
const isNotAFunction = require('../../utils').isNotAFunction;
const expectThrow = require('../../utils').expectThrow;

const ProxyTypeMockAbstraction = artifacts.require('ProxyTypeMock');

contract('ProxyType', (accounts) => {
  describe('constructor', () => {
    it('creation: should set proxy type id to 1', async () => {
      const errMsg = 'Incorrect type or not set';
      const typeId = 1;
      const instance = await ProxyTypeMockAbstraction.new(typeId, { from: accounts[0] });
      const proxyTypeId = await instance.proxyType.call();
      assert.strictEqual(proxyTypeId.toNumber(), typeId, errMsg);
    });

    it('creation: should set proxy type id to 2', async () => {
      const errMsg = 'Incorrect type or not set';
      const typeId = 2;
      const instance = await ProxyTypeMockAbstraction.new(typeId, { from: accounts[0] });
      const proxyTypeId = await instance.proxyType.call();
      assert.strictEqual(proxyTypeId.toNumber(), typeId, errMsg);
    });

    it('creation: cannot set type to number other than 1 or 2', async () => {
      const errMsg = 'Incorrect type sent';
      const typeId = 3;
      expectThrow(ProxyTypeMockAbstraction.new(typeId, { from: accounts[0] }), errMsg);
    });

    it('after creation: cannot set proxy type id', async () => {
      const errMsg = 'Allowed calling internal function';
      const typeId = 1;
      const instance = await ProxyTypeMockAbstraction.new(typeId, { from: accounts[0] });
      try {
        await instance.setProxyTypeId(0, { from: accounts[0] });
      } catch(e) {
        assert.isTrue(isNotAFunction(e), errMsg);
        const proxyTypeId = await instance.proxyType.call();
        assert.strictEqual(proxyTypeId.toNumber(), typeId, errMsg);
        return;
      }
      assert.isTrue(false, `${errMsg} - did not throw`);
    });
  });
});
