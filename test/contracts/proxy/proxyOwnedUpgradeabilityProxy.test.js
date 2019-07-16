/* eslint max-len:0 */
const isEVMException = require('../../utils').isEVMException;
const encodeCall = require('../../helpers/encodeCall');

const OwnedUpgradeabilityProxyAbstraction = artifacts.require('OwnedUpgradeabilityProxy');
const ImplementationMockAbstractionV0 = artifacts.require('ImplementationMock_v0');
const ImplementationMockAbstractionV1 = artifacts.require('ImplementationMock_v1');
const ImplementationMockAbstractionV2 = artifacts.require('ImplementationMock_v2');

contract('ProxyOwnedUpgradeability', (accounts) => {
  const from = accounts[0];
  const newOwner = accounts[1];
  const initializeData = encodeCall('initialize');

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
    it('creation: should set owner', async () => {
      const errMsg = 'Incorrect owner address or not set';
      const proxy = await OwnedUpgradeabilityProxyAbstraction.new({ from });
      const setAddress = await proxy.proxyOwner.call();
      assert.strictEqual(setAddress, from, errMsg);
    });
  });

  describe('.transferProxyOwnership()', () => {
    it('it should allow the owner to assign a new owner', async () => {
      const errMsg = 'Owner address not changed or not set';
      const proxy = await OwnedUpgradeabilityProxyAbstraction.new({ from });

      await proxy.transferProxyOwnership(newOwner);

      const newAddress = await proxy.proxyOwner.call();
      assert.strictEqual(newAddress, newOwner, errMsg);
    });

    it('it should not allow the non-owner to assign a new owner', async () => {
      const errMsg = 'Owner address changed';
      const proxy = await OwnedUpgradeabilityProxyAbstraction.new({ from });

      try {
        await proxy.transferProxyOwnership(newOwner, { from: newOwner });
      } catch(e) {
        assert.isTrue(isEVMException(e), errMsg);
        const newAddress = await proxy.proxyOwner.call();
        assert.strictEqual(newAddress, from, errMsg);
        return;
      }
      assert.isTrue(false, `${errMsg} - did not throw`);
    });
  });

  describe('.upgradeTo', () => {
    it('it sets the implementation to the new version', async () => {
      const errMsg = 'Incorrect return from implementation on Proxy';
      const proxy = await OwnedUpgradeabilityProxyAbstraction.new({ from });
      const tx = await proxy.upgradeTo(implAddressV0, { from });
      const log = tx.logs[0];
      assert.equal(log.event, 'Upgraded');
      const instance = ImplementationMockAbstractionV0.at(proxy.address);
      await instance.initialize();
      const implementation = await proxy.implementation();
      assert.equal(implementation, implAddressV0, errMsg);
    });

    it('it does not allow the same implementation address', async () => {
      const errMsg = 'should throw EVM exception for same address';
      const proxy = await OwnedUpgradeabilityProxyAbstraction.new({ from });
      await proxy.upgradeTo(implAddressV0, { from });
      const implementation = await proxy.implementation();
      assert.equal(implementation, implAddressV0, errMsg);
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
      const proxy = await OwnedUpgradeabilityProxyAbstraction.new({ from });
      try {
        await proxy.upgradeTo(0, { from });
      } catch(e) {
        assert.isTrue(isEVMException(e), errMsg);
        return;
      }
      assert.isTrue(false, `${errMsg} - did not throw`);
    });

    it('it does not allow non-owner address to upgrade implementation', async () => {
      const errMsg = 'should throw EVM exception for non-owner address';
      const proxy = await OwnedUpgradeabilityProxyAbstraction.new({ from });
      const ownerAddress = await proxy.proxyOwner.call();
      assert.strictEqual(ownerAddress, from, errMsg);
      try {
        await proxy.upgradeTo(implAddressV0, { from: newOwner });
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

      const proxy = await OwnedUpgradeabilityProxyAbstraction.new({ from });

      const tx = await proxy.upgradeToAndCall(implAddressV0, initializeData, { from });
      const log = tx.logs[0];
      assert.equal(log.event, 'Upgraded');

      const implementation = await proxy.implementation();
      assert.equal(implementation, implAddressV0, errImpl);

      const instance = ImplementationMockAbstractionV0.at(proxy.address);

      const answer = await instance.answer();
      assert.equal(answer.toNumber(), expectedAnswer, errInit);
    });

    it('it does not allow the same implementation address', async () => {
      const errMsg = 'should throw EVM exception for same address';
      const proxy = await OwnedUpgradeabilityProxyAbstraction.new({ from });
      await proxy.upgradeTo(implAddressV0, { from });
      const implementation = await proxy.implementation();
      assert.equal(implementation, implAddressV0, 'Incorrect return from implementation on Proxy');

      try {
        await proxy.upgradeToAndCall(implAddressV0, initializeData, { from });
      } catch(e) {
        assert.isTrue(isEVMException(e), errMsg);
        return;
      }
      assert.isTrue(false, `${errMsg} - did not throw`);
    });

    it('it does not allow address(0) implementation address', async () => {
      const errMsg = 'should throw EVM exception for address(0)';
      const proxy = await OwnedUpgradeabilityProxyAbstraction.new({ from });
      try {
        await proxy.upgradeToAndCall(0, initializeData, { from });
      } catch(e) {
        assert.isTrue(isEVMException(e), errMsg);
        return;
      }
      assert.isTrue(false, `${errMsg} - did not throw`);
    });

    it('it does not allow non-owner address to upgrade implementation', async () => {
      const errMsg = 'should throw EVM exception for non-owner address';
      const proxy = await OwnedUpgradeabilityProxyAbstraction.new({ from });
      const ownerAddress = await proxy.proxyOwner.call();
      assert.strictEqual(ownerAddress, from, errMsg);
      try {
        await proxy.upgradeToAndCall(implAddressV0, initializeData, { from: newOwner });
      } catch(e) {
        assert.isTrue(isEVMException(e), errMsg);
        return;
      }
      assert.isTrue(false, `${errMsg} - did not throw`);
    });
  });

  describe('delegateCall', () => {
    let proxy;

    beforeEach(async () => {
      proxy = await OwnedUpgradeabilityProxyAbstraction.new({ from });
      await proxy.upgradeToAndCall(implAddressV0, initializeData, { from });
    });

    context('Pre-upgrade', () => {
      describe('.seekPure()', () => {
        it('it allows calling a function on the implementationV0 and returns value', async () => {
          const errMsg = 'Incorrect return from implementationV0';
          const expected = 42;

          const instance = ImplementationMockAbstractionV0.at(proxy.address);
          const result = await instance.seekPure({ from });
          assert.equal(result.toNumber(), expected, errMsg);
        });
      });

      describe('.answer()', () => {
        it('it allows calling a getter function for a stored value on the implementationV0 and returns the value', async () => {
          const errMsg = 'Incorrect return from getter func';
          const expected = 42;

          const instance = ImplementationMockAbstractionV0.at(proxy.address);
          const result = await instance.answer();
          assert.equal(result.toNumber(), expected, errMsg);
        });
      });

      describe('.getMemSlot0()', () => {
        it('it retrieves the first memory slot for the contract - CONSTANT_1', async () => {
          const errMsg = 'Incorrect return for memory slot';
          const expected = 1;

          const instance = ImplementationMockAbstractionV0.at(proxy.address);
          const result = await instance.getMemSlot0();
          assert.equal(result.toNumber(), expected, errMsg);
        });
      });
    });

    context('Post-upgradeToAndCall', () => {
      let proxy;
      const errImpl = 'Incorrect return from implementation on Proxy';

      beforeEach(async () => {
        proxy = await OwnedUpgradeabilityProxyAbstraction.new({ from });
        await proxy.upgradeToAndCall(implAddressV0, initializeData, { from });
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
        it('it retrieves the first memory slot for the contract - CONSTANT_BOOL', async () => {
          const errMsg = 'Incorrect return for memory slot 0';
          const expected = true;

          const expected0 = 1;
          const instancev0 = ImplementationMockAbstractionV0.at(proxy.address);
          const resultv0 = await instancev0.getMemSlot0();
          assert.equal(resultv0, expected0, `${errMsg} - v0`);

          await proxy.upgradeToAndCall(implAddressV1, initializeData, { from });

          const implementation = await proxy.implementation();
          assert.equal(implementation, implAddressV1, errImpl);

          const instance = ImplementationMockAbstractionV1.at(proxy.address);
          const result = await instance.getMemSlot0();
          assert.equal(result, expected, errMsg);
        });
      });
    });
  });

  describe('upgrading with inheritance', () => {
    let proxy;
    const errImpl = 'Incorrect return from implementation on Proxy';

    let implementationV2;
    let implAddressV2;

    beforeEach(async () => {
      implementationV2 = await ImplementationMockAbstractionV2.new({ from });
      implAddressV2 = implementationV2.address;

      proxy = await OwnedUpgradeabilityProxyAbstraction.new({ from });
      await proxy.upgradeToAndCall(implAddressV1, initializeData, { from });
    });

    describe('.answer2()', () => {
      it('it allows calling a getter function from inherited contract that returns its memory allocation', async () => {
        const errMsg = 'Incorrect return from getter .answer2()';
        const expected = 84;

        await proxy.upgradeToAndCall(implAddressV2, initializeData, { from });

        const implementation = await proxy.implementation();
        assert.equal(implementation, implAddressV2, errImpl);

        const instance = ImplementationMockAbstractionV2.at(proxy.address);
        const result = await instance.answer2();
        assert.equal(result.toNumber(), expected, errMsg);
      });
    });

    describe('.answer3()', () => {
      it('it allows calling a getter function for a stored value on the implementationV2 and returns the value', async () => {
        const errMsg = 'Incorrect return from getter .answer3()';
        const expected = 126;

        await proxy.upgradeToAndCall(implAddressV2, initializeData, { from });

        const implementation = await proxy.implementation();
        assert.equal(implementation, implAddressV2, errImpl);

        const instance = ImplementationMockAbstractionV2.at(proxy.address);
        const result = await instance.answer3();
        assert.equal(result.toNumber(), expected, errMsg);
      });
    });

    describe('.getMemSlot0()', () => {
      /**
       * This test attempts to show that the implV2 maintains memory when
       * V2 inherits from V1 and calls super.initialize).
       */
      it('it retrieves the first memory slot for the contract from inherited contract - CONSTANT_BOOL', async () => {
        const errMsg = 'Incorrect return for memory slot 0';
        const expected = true;

        const instancev1 = ImplementationMockAbstractionV1.at(proxy.address);
        const resultv1 = await instancev1.getMemSlot0();
        assert.equal(resultv1, expected, `${errMsg} - v1`);

        await proxy.upgradeToAndCall(implAddressV2, initializeData, { from });

        const implementation = await proxy.implementation();
        assert.equal(implementation, implAddressV2, errImpl);

        const instance = ImplementationMockAbstractionV2.at(proxy.address);
        const result = await instance.getMemSlot0();
        assert.equal(result, expected, `${errMsg} - v2`);
      });
    });
  });
});
