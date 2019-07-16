const {
  expectThrow,
} = require('../utils.js');

const OwnedUpgradeabilityProxyAbstraction = artifacts.require('OwnedUpgradeabilityProxy');

const AssetTokenAbstraction = artifacts.require('AssetToken');
const ProxyTokenFactoryAbstraction = artifacts.require('ProxyTokenFactory');

contract('ProxyTokenFactory', function (accounts) {
  const owner = accounts[0];
  const tokenOwner = accounts[1];
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  const initialSupply = 100000;
  const tokenName = 'ABC Property';
  const decimalUnits = 18;
  const tokenSymbol = 'ABC';

  beforeEach(async () => {
    this.implementation = await AssetTokenAbstraction.new({ from: owner });
    await this.implementation.initialize(
      owner,
      0,
      'AssetToken Implementation',
      decimalUnits,
      'AT-Impl',
      { from: owner },
    );
    this.factory = await ProxyTokenFactoryAbstraction.new({ from: owner });
  });

  describe('Creation', () => {
    it('it should have an owner and not be paused', async () => {
      const fOwner = await this.factory.owner();
      assert.equal(fOwner, owner, 'Factory owner not set');

      const isPaused = await this.factory.paused();
      assert.isFalse(isPaused);
    });
  });
  describe('.createProxyToken()', () => {
    it('it should launch a proxyToken and initialize', async () => {
      const tokenLaunch = await this.factory.createProxyToken(
        this.implementation.address,
        initialSupply,
        tokenName,
        decimalUnits,
        tokenSymbol,
        { from: tokenOwner },
      );
      const proxyAddress = tokenLaunch.logs[tokenLaunch.logs.length - 1].args.proxyTokenAddress;
      assert.notEqual(this.implementation.address, proxyAddress);

      const proxy = OwnedUpgradeabilityProxyAbstraction.at(proxyAddress);

      const proxyOwner = await proxy.proxyOwner.call();
      assert.equal(proxyOwner, tokenOwner, 'Proxy Owner incorrect');

      const implAddress = await proxy.implementation.call();
      assert.equal(implAddress, this.implementation.address, 'Impl address incorrect');

      const proxiedToken = await AssetTokenAbstraction.at(proxy.address);

      const recordedTokenOwner = await proxiedToken.owner.call();
      assert.equal(recordedTokenOwner, tokenOwner, 'Token Owner incorrect');

      // Set up initial Balances
      const tokenOwnerBalance = await proxiedToken.balanceOf.call(tokenOwner);
      assert.equal(tokenOwnerBalance.toNumber(), initialSupply, 'initial supply incorrect');

      const factoryOwnerBalance = await proxiedToken.balanceOf.call(owner);
      assert.equal(factoryOwnerBalance.toNumber(), 0, 'factory owner should not have tokens');

      const factoryBalance = await proxiedToken.balanceOf.call(this.factory.address);
      assert.equal(factoryBalance.toNumber(), 0, 'factory should not have tokens');

      const implementationBalance = await proxiedToken.balanceOf.call(this.implementation.address);
      assert.equal(implementationBalance.toNumber(), 0, 'implementation should not have tokens');
    });
    it('it should revert a launch when paused', async () => {
      const errMsg = 'Should throw when trying to launch Token while factory is paused';
      await this.factory.pause({ from: owner });
      const isPaused = await this.factory.paused();
      assert.isTrue(isPaused);

      await expectThrow(
        this.factory.createProxyToken(
          this.implementation.address,
          initialSupply,
          tokenName,
          decimalUnits,
          tokenSymbol,
          { from: tokenOwner },
        ),
        errMsg,
      );
    });
    it('it should revert a launch when no implementation', async () => {
      const errMsg = 'Should throw when trying to launch Token with zero address implementation';

      await expectThrow(
        this.factory.createProxyToken(
          ZERO_ADDRESS,
          initialSupply,
          tokenName,
          decimalUnits,
          tokenSymbol,
          { from: tokenOwner },
        ),
        errMsg,
      );
    });

    it('it should revert a launch when implementation is factory', async () => {
      const errMsg = 'Should throw when trying to launch Token with factory as implementation';

      await expectThrow(
        this.factory.createProxyToken(
          this.factory.address,
          initialSupply,
          tokenName,
          decimalUnits,
          tokenSymbol,
          { from: tokenOwner },
        ),
        errMsg,
      );
    });

    it('it should not revert a launch when initialSupply is 0', async () => {
      const tokenLaunch = await this.factory.createProxyToken(
        this.implementation.address,
        0,
        tokenName,
        decimalUnits,
        tokenSymbol,
        { from: tokenOwner },
      );
      const event = tokenLaunch.logs[0];
      assert.equal(event.event, 'ProxyTokenCreated');
      assert.equal(event.args._initialSupply.toNumber(), 0);
    });
  });
});
