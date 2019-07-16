const isEVMException = require('../../utils').isEVMException;

const OupAbstraction = artifacts.require('OwnedUpgradeabilityProxy');
let Oup;

contract('OwnedUpgradeabilityProxy', (accounts) => {
  beforeEach(async () => {
    Oup = await OupAbstraction.new({ from: accounts[0] });
  });

  describe('proxyOwner', () => {
    it('creation: should have an owner', async () => {
      const owner = await Oup.proxyOwner.call();
      assert.strictEqual(owner, accounts[0]);
    });

    it('transferProxyOwnership: should be able to change ownership if owner', async () => {
      await Oup.transferProxyOwnership(accounts[1], { from: accounts[0] });
      const owner = await Oup.proxyOwner.call();
      assert.strictEqual(owner, accounts[1]);
    });

    it('transferProxyOwnership: shouldn\'t be able to change ownership if not the owner', async () => {
      const errMsg = 'should throw EVM exception';
      try {
        const owner = await Oup.proxyOwner.call();
        assert.strictEqual(owner, accounts[0]);
        await Oup.transferProxyOwnership(accounts[1], { from: accounts[1] });
      } catch (e) {
        assert.isTrue(isEVMException(e), errMsg);
        const owner = await Oup.proxyOwner.call();
        assert.strictEqual(owner, accounts[0]);
        return;
      }
      assert.isTrue(false, `${errMsg} - did not throw`);
    });
  });
});
