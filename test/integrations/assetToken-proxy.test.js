/* eslint max-len:0 */
const expectThrow = require('../utils.js').expectThrow;
const encodeCall = require('../helpers/encodeCall');

const OwnedUpgradeabilityProxyAbstraction = artifacts.require('OwnedUpgradeabilityProxy');
const AssetTokenAbstraction = artifacts.require('AssetToken');
const VersionableAssetTokenMockAbstraction = artifacts.require('VersionableAssetTokenMock');

contract('Proxied AssetToken', function (accounts) {
  const proxyOwner = accounts[0];
  const tokenOwner = accounts[1];
  const to = accounts[2];
  const spender = accounts[3];

  const initialSupply = 100000;
  const tokenName = 'ABC Property';
  const decimalUnits = 18;
  const tokenSymbol = 'ABC';

  const newVersion = '0.4';

  const initializeDataV0 = encodeCall(
    'initialize',
    ['address', 'uint', 'string', 'uint8', 'string'],
    [tokenOwner, initialSupply, tokenName, decimalUnits, tokenSymbol],
  );
  const initializeDataV1 = encodeCall(
    'initialize',
    ['string'],
    [newVersion],
  );

  beforeEach(async () => {
    this.proxy = await OwnedUpgradeabilityProxyAbstraction.new({ from: proxyOwner });
    const assetToken = await AssetTokenAbstraction.new({ from: proxyOwner });

    const recordedOwner = await this.proxy.proxyOwner.call();
    assert.equal(recordedOwner, proxyOwner, 'Proxy owner incorrect');

    await this.proxy.upgradeToAndCall(assetToken.address, initializeDataV0, { from: proxyOwner });

    const implAddress = await this.proxy.implementation.call();
    assert.equal(implAddress, assetToken.address, 'Impl address incorrect');

    this.proxiedToken = await AssetTokenAbstraction.at(this.proxy.address);
  });

  describe('first version AssetToken', () => {
    describe('Initialize AssetToken for Proxy', () => {
      it('it should successfully initialize AssetToken contract through proxy', async () => {
        const name = await this.proxiedToken.name.call();
        assert.strictEqual(name, tokenName, 'Token Name incorrect');

        const decimals = await this.proxiedToken.decimals.call();
        assert.strictEqual(decimals.toNumber(), decimalUnits, 'decimalUnits incorrect');

        const symbol = await this.proxiedToken.symbol.call();
        assert.strictEqual(symbol, tokenSymbol, 'Token Symbol incorrect');

        const balance = await this.proxiedToken.balanceOf.call(tokenOwner);
        assert.strictEqual(balance.toNumber(), initialSupply, 'Token Owner balance incorrect');
      });
      it('it should throw an error if initialized a second time', async () => {
        const errMsg = 'should not re-initialize';
        await expectThrow(
          this.proxiedToken.initialize(
            tokenOwner,
            initialSupply,
            tokenName,
            decimalUnits,
            tokenSymbol,
            { from: tokenOwner },
          ),
          errMsg,
        );
      });
    });

    describe('proxied.changeName()', () => {
      it('it should allow the tokenOwner to change the name', async () => {
        const errMsg = 'it should change the name for the tokenOwner';
        const beforeName = await this.proxiedToken.name.call();
        const afterName = `${beforeName}New`;

        await this.proxiedToken.changeName(afterName, { from: tokenOwner });
        const setName = await this.proxiedToken.name.call();
        assert.equal(setName, afterName, errMsg);
      });
      it('it should not allow a proxyOwner to change the name', async () => {
        const errMsg = 'it should not change the name for a proxyOwner';
        const beforeName = await this.proxiedToken.name.call();
        const afterName = `${beforeName}New`;

        await expectThrow(
          this.proxiedToken.changeName(afterName, { from: proxyOwner }),
          errMsg,
        );

        const setName = await this.proxiedToken.name.call();
        assert.equal(setName, beforeName, errMsg);
      });
    });
    describe('proxied.changeSymbol()', () => {
      it('it should successfully change AssetToken symbol', async () => {
        const symbol = await this.proxiedToken.symbol.call();
        assert.strictEqual(symbol, tokenSymbol, 'Token Symbol incorrect');

        const newSymbol = `${tokenSymbol}new`;
        const errMsg = 'Symbol did not change';

        await this.proxiedToken.changeSymbol(newSymbol, { from: tokenOwner });
        const afterSymbol = await this.proxiedToken.symbol.call();
        assert.equal(afterSymbol, newSymbol, errMsg);
      });
    });

    describe('proxied.transfer()', () => {
      it('it should successfully transfer AssetToken contract through proxy', async () => {
        const balance = await this.proxiedToken.balanceOf.call(tokenOwner);
        assert.strictEqual(balance.toNumber(), initialSupply, 'Token Owner balance incorrect');

        await this.proxiedToken.transfer(to, initialSupply, { from: tokenOwner });

        const ownerBalanceAfter = await this.proxiedToken.balanceOf.call(tokenOwner);
        assert.strictEqual(ownerBalanceAfter.toNumber(), 0, 'After Token Owner balance incorrect');

        const toBalanceAfter = await this.proxiedToken.balanceOf.call(to);
        assert.strictEqual(toBalanceAfter.toNumber(), initialSupply, 'After "to" balance incorrect');
      });
      it('emits a transfer event', async () => {
        const { logs } = await this.proxiedToken.transfer(to, initialSupply, { from: tokenOwner });

        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'Transfer');
        assert.equal(logs[0].args.from, tokenOwner);
        assert.equal(logs[0].args.to, to);
        assert(logs[0].args.value.eq(initialSupply));
      });
      it('should fail when trying to transfer to contract address', async () => {
        const errMsg = 'should not transfer to proxy contract address';
        const balanceZeroBefore = await this.proxiedToken.balanceOf.call(this.proxiedToken.address);
        assert.strictEqual(balanceZeroBefore.toNumber(), 0);
        await expectThrow(
          this.proxiedToken.transfer(this.proxiedToken.address, initialSupply, { from: tokenOwner }),
          errMsg,
        );
        const balanceAfter = await this.proxiedToken.balanceOf.call(tokenOwner);
        assert.strictEqual(balanceAfter.toNumber(), initialSupply);
        const balanceZero = await this.proxiedToken.balanceOf.call(this.proxiedToken.address);
        assert.strictEqual(balanceZero.toNumber(), 0);
      });
    });

    describe('proxied.approve()', () => {
      it('it should allow approval', async () => {
        const errMsg = 'it should approve the spender';
        const amount = 100;
        const { logs } = await this.proxiedToken.approve(spender, amount, { from: tokenOwner });

        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'Approval');
        assert.equal(logs[0].args.owner, tokenOwner);
        assert.equal(logs[0].args.spender, spender);
        assert(logs[0].args.value.eq(amount));

        const allowance = await this.proxiedToken.allowance(tokenOwner, spender);
        assert.equal(allowance.toNumber(), amount, errMsg);
      });
    });

    describe('proxied.decreaseApproval()', () => {
      const amount = 100;

      beforeEach(async () => {
        await this.proxiedToken.approve(spender, amount, { from: tokenOwner });
      });

      it('it should reduce spender\'s allowance', async () => {
        const { logs } = await this.proxiedToken.decreaseApproval(spender, amount, { from: tokenOwner });

        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'Approval');
        assert.equal(logs[0].args.owner, tokenOwner);
        assert.equal(logs[0].args.spender, spender);
        assert(logs[0].args.value.eq(0));

        const allowance = await this.proxiedToken.allowance(tokenOwner, spender);
        assert.equal(allowance, 0);
      });
    });

    describe('proxied.transferFrom()', () => {
      const amount = 100;

      beforeEach(async () => {
        await this.proxiedToken.approve(spender, amount, { from: tokenOwner });
      });

      it(`should transfer ${amount} to 'to' account on behalf of tokenOwner`, async () => {
        const beforeOwner = await this.proxiedToken.balanceOf.call(tokenOwner);
        assert.strictEqual(beforeOwner.toNumber(), initialSupply, 'Owner does not have correct start balance');
        const beforeTo = await this.proxiedToken.balanceOf.call(to);
        assert.strictEqual(beforeTo.toNumber(), 0, 'To does not have correct start balance');

        const { logs } = await this.proxiedToken.transferFrom(tokenOwner, to, amount, { from: spender });
        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'Transfer');
        assert.equal(logs[0].args.from, tokenOwner);
        assert.equal(logs[0].args.to, to);
        assert(logs[0].args.value.eq(amount));

        const afterOwner = await this.proxiedToken.balanceOf.call(tokenOwner);
        assert.strictEqual(afterOwner.toNumber(), initialSupply - amount, 'Owner does not have correct end balance');
        const afterTo = await this.proxiedToken.balanceOf.call(to);
        assert.strictEqual(afterTo.toNumber(), amount, 'To does not have correct end balance');
      });
      it('should fail when trying to transfer to proxy contract address', async () => {
        const errMsg = 'should not transfer to proxy contract address';
        await expectThrow(
          this.proxiedToken.transferFrom(tokenOwner, this.proxiedToken.address, amount, { from: spender }),
          errMsg,
        );
        const balanceAfter = await this.proxiedToken.balanceOf.call(tokenOwner);
        assert.strictEqual(balanceAfter.toNumber(), initialSupply);
      });
    });

    describe('proxied.canSend()', () => {
      it('it should return true if there are no modules loaded', async () => {
        const errMsg = 'Should validate transfer when no modules present';
        const isValid = await this.proxiedToken.canSend.call(
          0x00,
          0x00,
          0,
          { from: tokenOwner },
        );
        assert.isTrue(isValid, errMsg);
      });
    });
  });
  describe('second version AssetToken', () => {
    beforeEach(async () => {
      const verionedAssetToken = await VersionableAssetTokenMockAbstraction.new({ from: proxyOwner });

      await this.proxy.upgradeToAndCall(verionedAssetToken.address, initializeDataV1, { from: proxyOwner });

      const implAddress = await this.proxy.implementation.call();
      assert.equal(implAddress, verionedAssetToken.address, 'Impl address incorrect after upgrade');

      this.upgradedToken = await VersionableAssetTokenMockAbstraction.at(this.proxy.address);
    });

    describe('Initialize VersionedAssetToken for Proxy', () => {
      it('it should successfully initialize VersionedAssetToken contract through proxy', async () => {
        const version = await this.upgradedToken.version.call();
        assert.strictEqual(version, newVersion, 'Token Version incorrect');
      });
      it('it should preserve AssetToken Data', async () => {
        const name = await this.upgradedToken.name.call();
        assert.strictEqual(name, tokenName, 'Token Name incorrect');

        const decimals = await this.upgradedToken.decimals.call();
        assert.strictEqual(decimals.toNumber(), decimalUnits, 'decimalUnits incorrect');

        const symbol = await this.upgradedToken.symbol.call();
        assert.strictEqual(symbol, tokenSymbol, 'Token Symbol incorrect');

        const balance = await this.upgradedToken.balanceOf.call(tokenOwner);
        assert.strictEqual(balance.toNumber(), initialSupply, 'Token Owner balance incorrect');
      });
    });
  });
  describe('maintain balances and ability to transfer through upgrade', () => {
    describe('proxied.transfer()', () => {
      it('it should successfully transfer AssetToken contract through proxy', async () => {
        const balance = await this.proxiedToken.balanceOf.call(tokenOwner);
        assert.strictEqual(balance.toNumber(), initialSupply, 'Token Owner balance incorrect');

        await this.proxiedToken.transfer(to, initialSupply, { from: tokenOwner });

        const ownerBalanceAfter = await this.proxiedToken.balanceOf.call(tokenOwner);
        assert.strictEqual(ownerBalanceAfter.toNumber(), 0, 'After Token Owner balance incorrect');

        const toBalanceAfter = await this.proxiedToken.balanceOf.call(to);
        assert.strictEqual(toBalanceAfter.toNumber(), initialSupply, 'After "to" balance incorrect');

        const verionedAssetToken = await VersionableAssetTokenMockAbstraction.new({ from: proxyOwner });

        await this.proxy.upgradeToAndCall(verionedAssetToken.address, initializeDataV1, { from: proxyOwner });

        const implAddress = await this.proxy.implementation.call();
        assert.equal(implAddress, verionedAssetToken.address, 'Impl address incorrect after upgrade');

        const upgradedToken = await VersionableAssetTokenMockAbstraction.at(this.proxy.address);

        const afterUpgradeOwnerBalance = await upgradedToken.balanceOf.call(tokenOwner);
        assert.strictEqual(afterUpgradeOwnerBalance.toNumber(), 0, 'After Upgrade Token Owner balance incorrect');

        const afterUpgradeToBalanceAfter = await this.proxiedToken.balanceOf.call(to);
        assert.strictEqual(afterUpgradeToBalanceAfter.toNumber(), initialSupply, 'After upgrade "to" balance incorrect');

        await this.proxiedToken.transfer(tokenOwner, initialSupply, { from: to });

        const afterBackOwnerBalance = await upgradedToken.balanceOf.call(tokenOwner);
        assert.strictEqual(afterBackOwnerBalance.toNumber(), initialSupply, 'After transfer back Token Owner balance incorrect');

        const afterBackToBalanceAfter = await this.proxiedToken.balanceOf.call(to);
        assert.strictEqual(afterBackToBalanceAfter.toNumber(), 0, 'After transfer back "to" balance incorrect');
      });
    });
  });
});
