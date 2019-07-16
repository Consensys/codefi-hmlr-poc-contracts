/* eslint max-len:0 */
const isNotAFunction = require('../../utils').isNotAFunction;

const ProxyImplMockAbstraction = artifacts.require('ProxyImplMock');
const ImplementationMockAbstraction = artifacts.require('ImplementationMock_v0');

contract('ProxyImpl', (accounts) => {
  let implementation;
  let implAddress;

  beforeEach(async () => {
    implementation = await ImplementationMockAbstraction.new({ from: accounts[0] });
    implAddress = implementation.address;
  });

  describe('constructor', () => {
    it('creation: should set implementation', async () => {
      const errMsg = 'Incorrect address or not set';
      const proxy = await ProxyImplMockAbstraction.new(implAddress, { from: accounts[0] });
      const setAddress = await proxy.implementation.call();
      assert.strictEqual(setAddress, implAddress, errMsg);
    });
  });

  describe('.seekPure()', () => {
    it('it allows calling a function on the implementation and returns value', async () => {
      const errMsg = 'Incorrect return from implementation';
      const proxy = await ProxyImplMockAbstraction.new(implAddress, { from: accounts[0] });
      const instance = ImplementationMockAbstraction.at(proxy.address);
      const result = await instance.seekPure({ from: accounts[0] });
      assert.equal(result.toNumber(), 42, errMsg);
    });

    it('it fails if the function does not exist', async () => {
      const errMsg = 'Allowed calling bad functions';
      const proxy = await ProxyImplMockAbstraction.new(implAddress, { from: accounts[0] });
      const instance = ImplementationMockAbstraction.at(proxy.address);
      try {
        await instance.badFunc({ from: accounts[0] });
      } catch(e) {
        assert.isTrue(isNotAFunction(e), errMsg);
        return;
      }
      assert.isTrue(false, `${errMsg} - did not throw`);
    });
  });

  describe('.answer()', () => {
    it('it allows calling a getter function for a stored value on the implementation and returns the value', async () => {
      const errMsg = 'Incorrect return from getter func';
      const expected = 42;
      const proxy = await ProxyImplMockAbstraction.new(implAddress, { from: accounts[0] });
      const instance = ImplementationMockAbstraction.at(proxy.address);
      await instance.initialize(); // required because the constructor does not work for proxied contracts
      const result = await instance.answer();
      assert.equal(result.toNumber(), expected, errMsg);
    });
  });
});
