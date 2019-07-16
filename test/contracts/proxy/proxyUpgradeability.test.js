/* eslint max-len:0 */
const isEVMException = require('../../utils').isEVMException;
const encodeCall = require('../../helpers/encodeCall');

const UpgradeabilityProxyMockAbstraction = artifacts.require('UpgradeabilityProxyMock');
const ImplementationMockAbstractionV0 = artifacts.require('ImplementationMock_v0');
const ImplementationMockAbstractionV1 = artifacts.require('ImplementationMock_v1');

contract('ProxyUpgradeability', (accounts) => {
  const from = accounts[0];
  let implementationV0;
  let implAddressV0;
  let implementationV1;
  let implAddressV1;

  beforeEach(async () => {
    implementationV0 = await ImplementationMockAbstractionV0.new({ from });
    implAddressV0 = implementationV0.address;
    implementationV1 = await ImplementationMockAbstractionV1.new({ from });
    implAddressV1 = implementationV1.address;
  });

  describe('constructor', () => {
    it('creation: should set implementationV0', async () => {
      const errMsg = 'Incorrect address or not set';
      const proxy = await UpgradeabilityProxyMockAbstraction.new(implAddressV0, { from });
      const setAddress = await proxy.implementation.call();
      assert.strictEqual(setAddress, implAddressV0, errMsg);
    });
  });

  context('Pre-upgrade', () => {
    describe('.seekPure()', () => {
      it('it allows calling a function on the implementationV1 and returns value', async () => {
        const errMsg = 'Incorrect return from implementationV1';
        const proxy = await UpgradeabilityProxyMockAbstraction.new(implAddressV0, { from });
        const instance = ImplementationMockAbstractionV0.at(proxy.address);
        const result = await instance.seekPure({ from });
        assert.equal(result.toNumber(), 42, errMsg);
      });
    });

    describe('.answer()', () => {
      it('it allows calling a getter function for a stored value on the implementationV0 and returns the value', async () => {
        const errMsg = 'Incorrect return from getter func';
        const expected = 42;
        const proxy = await UpgradeabilityProxyMockAbstraction.new(implAddressV0, { from });
        const instance = ImplementationMockAbstractionV0.at(proxy.address);
        await instance.initialize(); // required because the constructor does not work for proxied contracts
        const result = await instance.answer();
        assert.equal(result.toNumber(), expected, errMsg);
      });
    });

    describe('.getMemSlot0()', () => {
      it('it retrieves the first memory slot for the contract - CONSTANT_1', async () => {
        const errMsg = 'Incorrect return for memory slot';
        const expected = 1;
        const proxy = await UpgradeabilityProxyMockAbstraction.new(implAddressV0, { from });
        const instance = ImplementationMockAbstractionV0.at(proxy.address);
        await instance.initialize(); // required because the constructor does not work for proxied contracts
        const result = await instance.getMemSlot0();
        assert.equal(result.toNumber(), expected, errMsg);
      });
    });
  });

  describe('.upgradeTo', () => {
    it('it sets the implementation to the new version', async () => {
      const errMsg = 'Incorrect return from implementation on Proxy';
      const proxy = await UpgradeabilityProxyMockAbstraction.new(implAddressV0, { from });
      const tx = await proxy.upgradeTo(implAddressV1, { from });
      const log = tx.logs[0];
      assert.equal(log.event, 'Upgraded');
      const instance = ImplementationMockAbstractionV1.at(proxy.address);
      await instance.initialize();
      const implementation = await proxy.implementation();
      assert.equal(implementation, implAddressV1, errMsg);
    });

    it('it does not allow the same implementation address', async () => {
      const errMsg = 'should throw EVM exception for same address';
      const proxy = await UpgradeabilityProxyMockAbstraction.new(implAddressV0, { from });
      try {
        await proxy.upgradeTo(implAddressV0, { from });
      } catch(e) {
        assert.isTrue(isEVMException(e), errMsg);
        return;
      }
      assert.isTrue(false, `${errMsg} - did not throw`);
    });

    it('it does not allow address(0) implementation address', async () => {
      const errMsg = 'should throw EVM exception for address(0)';
      const proxy = await UpgradeabilityProxyMockAbstraction.new(implAddressV0, { from });
      try {
        await proxy.upgradeTo(0, { from });
      } catch(e) {
        assert.isTrue(isEVMException(e), errMsg);
        return;
      }
      assert.isTrue(false, `${errMsg} - did not throw`);
    });
  });

  describe('.upgradeToAndCall', () => {
    it('it sets the implementation to the new version and calls initialize', async () => {
      const errImpl = 'Incorrect return from implementation on Proxy';
      const errInit = 'New implementation not initialized';
      const expectedAnswer = 42;
      const expectedAnswer2 = 84;

      const proxy = await UpgradeabilityProxyMockAbstraction.new(implAddressV0, { from });
      const instanceV0 = ImplementationMockAbstractionV0.at(proxy.address);
      await instanceV0.initialize();
      const answer = await instanceV0.answer();
      assert.equal(answer.toNumber(), expectedAnswer, `${errInit} - V0`);

      const initializeData = encodeCall('initialize');

      const tx = await proxy.upgradeToAndCall(implAddressV1, initializeData, { from });
      const log = tx.logs[0];
      assert.equal(log.event, 'Upgraded');

      const implementation = await proxy.implementation();
      assert.equal(implementation, implAddressV1, errImpl);

      const instanceV1 = ImplementationMockAbstractionV1.at(proxy.address);

      const answer2 = await instanceV1.answer2();
      assert.equal(answer2.toNumber(), expectedAnswer2, errInit);
    });

    it('it does not allow the same implementation address', async () => {
      const errMsg = 'should throw EVM exception for same address';
      const proxy = await UpgradeabilityProxyMockAbstraction.new(implAddressV0, { from });
      try {
        await proxy.upgradeTo(implAddressV0, { from });
      } catch(e) {
        assert.isTrue(isEVMException(e), errMsg);
        return;
      }
      assert.isTrue(false, `${errMsg} - did not throw`);
    });
  });

  context('Post-upgradeToAndCall', () => {
    let proxy;
    const initializeData = encodeCall('initialize');
    const errImpl = 'Incorrect return from implementation on Proxy';

    beforeEach(async () => {
      proxy = await UpgradeabilityProxyMockAbstraction.new(implAddressV0, { from });
      const instanceV0 = ImplementationMockAbstractionV0.at(proxy.address);
      await instanceV0.initialize();
    });

    describe('.seekPure()', () => {
      it('it allows calling a function on the implementationV1 and returns value', async () => {
        const errMsg = 'Incorrect return from implementationV1';
        const expected = 84;

        await proxy.upgradeToAndCall(implAddressV1, initializeData, { from });

        const implementation = await proxy.implementation();
        assert.equal(implementation, implAddressV1, errImpl);

        const instance = ImplementationMockAbstractionV1.at(proxy.address);
        const result = await instance.seekPure({ from });
        assert.equal(result.toNumber(), expected, errMsg);
      });
    });

    describe('.answer2()', () => {
      it('it allows calling a getter function for a stored value on the implementationV1 and returns the value', async () => {
        const errMsg = 'Incorrect return from getter .answer2()';
        const expected = 84;

        await proxy.upgradeToAndCall(implAddressV1, initializeData, { from });

        const implementation = await proxy.implementation();
        assert.equal(implementation, implAddressV1, errImpl);

        const instance = ImplementationMockAbstractionV1.at(proxy.address);
        const result = await instance.answer2();
        assert.equal(result.toNumber(), expected, errMsg);
      });
    });

    describe('.getMemSlot0()', () => {
      /**
       * This test attempts to show that the implV2 receives fresh memory.
       * V1 has an uint in memory slot 0x0 that gets initialized to 1
       * V2 has a bool in memory slot 0x0 that gets initialized to true.
       */
      it('it retrieves the first memory slot for the contract - CONSTANT_1', async () => {
        const errMsg = 'Incorrect return for memory slot 0';
        const expected = true;

        const expected0 = 1;
        const instancev0 = ImplementationMockAbstractionV0.at(proxy.address);
        const resultv0 = await instancev0.getMemSlot0();
        assert.equal(resultv0, expected0, `${errMsg} - v0`);

        await proxy.upgradeToAndCall(implAddressV1, initializeData, { from });

        const implementation = await proxy.implementation();
        assert.equal(implementation, implAddressV1, errImpl);

        const instancev1 = ImplementationMockAbstractionV1.at(proxy.address);
        const resultv1 = await instancev1.getMemSlot0();
        assert.equal(resultv1, expected, `${errMsg} - v1`);
      });
    });
  });
});
