/* eslint max-len:0 */
const util = require('ethereumjs-util');
const ABI = require('ethereumjs-abi');
const { expectThrow } = require('../utils.js');
const encodeCall = require('../helpers/encodeCall');

const OwnedUpgradeabilityProxyAbstraction = artifacts.require('OwnedUpgradeabilityProxy');
const ProxyTokenFactoryAbstraction = artifacts.require('ProxyTokenFactory');

const AssetTokenAbstraction = artifacts.require('AssetToken');
const PausableValidator = artifacts.require('./PausableValidator.sol');
const WhitelistValidator = artifacts.require('./WhitelistValidator.sol');

const ExchangeAbstraction = artifacts.require('Exchange');

const SimpleToken = artifacts.require('SimpleToken');
const DistributionIssuer = artifacts.require('DistributionIssuer');

const SimpleLinkRegistry = artifacts.require('SimpleLinkRegistry');

const VersionableAssetTokenMockAbstraction = artifacts.require('VersionableAssetTokenMock');

contract('Full Integration Test', function (accounts) {
  const adminOwner = accounts[0];
  const tokenOwner = accounts[1];
  const to = accounts[2];
  const maker = accounts[3];
  const taker = accounts[4];

  const initialSupply = 100000;
  let simpleTokenTotalSupply;
  const tokenName = 'ABC Property';
  const decimalUnits = 18;
  const tokenSymbol = 'ABC';

  const newVersion = '0.4';

  const TRANSFER_VALIDATOR_TYPE = 1;

  let sentByTokenOwner = 0;

  const initializeDataV1 = encodeCall(
    'initialize',
    ['string'],
    [newVersion],
  );

  before(async () => {
    // Launch Link Registry
    this.linkRegistry = await SimpleLinkRegistry.new({ from: adminOwner });
    // Launch Distribution Issuer
    this.distributionIssuer = await DistributionIssuer.new({ from: adminOwner });
    // Launch ERC-20 Token (Fake Dai)
    this.simpleToken = await SimpleToken.new({ from: taker });
    simpleTokenTotalSupply = await this.simpleToken.totalSupply.call();
    // Launch Exchange Swap
    this.exchange = await ExchangeAbstraction.new({ from: adminOwner });
    // Launch ProxyTokenFactory
    this.factory = await ProxyTokenFactoryAbstraction.new({ from: adminOwner });
    // Launch AssetToken Singleton for Implementations
    this.tokenV0 = await AssetTokenAbstraction.new({ from: adminOwner });
  });

  describe('Full Integration Test', () => {
    it('it should launch proxy and upgrade to TokenV0', async () => {
      // Launch Proxy Token
      const receipt = await this.factory.createProxyToken(
        this.tokenV0.address,
        initialSupply,
        tokenName,
        decimalUnits,
        tokenSymbol,
        { from: tokenOwner },
      );

      this.proxy = OwnedUpgradeabilityProxyAbstraction.at(receipt.logs[0].args.proxyTokenAddress);

      const implAddress = await this.proxy.implementation.call();
      assert.equal(implAddress, this.tokenV0.address, 'Impl address incorrect');

      this.proxiedToken = await AssetTokenAbstraction.at(this.proxy.address);

      const recordedTokenOwner = await this.proxiedToken.owner.call();
      assert.equal(recordedTokenOwner, tokenOwner, 'Token Owner incorrect');
      // Set up initial Balances
      this.tokenOwnerBalance = await this.proxiedToken.balanceOf.call(tokenOwner);
      assert.equal(this.tokenOwnerBalance.toNumber(), initialSupply);

      this.toBalance = await this.proxiedToken.balanceOf.call(to);
      assert.equal(this.toBalance.toNumber(), 0);

      this.adminOwnerBalance = await this.proxiedToken.balanceOf.call(adminOwner);
      assert.equal(this.adminOwnerBalance.toNumber(), 0);
    });

    it('it should set info in LinkRegistry', async () => {
      // Add Token V0 Info to LinkRegistry
      const linkKey = 'moreInfo';
      const linkValue = 'https://meridio.co/tokenInfo';
      await this.linkRegistry.setLink(
        this.proxiedToken.address,
        linkKey,
        linkValue,
        { from: adminOwner },
      );

      // Other user can find out about Link Info
      const linkInfo = await this.linkRegistry.getLink(
        this.proxiedToken.address,
        linkKey,
        { from: to },
      );

      assert.strictEqual(
        linkInfo,
        linkValue,
      );
    });

    it('it should add a pausableValidator', async () => {
      // TokenOwner Adds Pausable Validator
      this.pausableValidator = await PausableValidator.new(
        { from: tokenOwner },
      );

      await this.proxiedToken.addModule(
        this.pausableValidator.address,
        { from: tokenOwner },
      );

      const pvResult = await this.proxiedToken.getModuleByTypeAndIndex.call(
        TRANSFER_VALIDATOR_TYPE, 0,
      );

      assert.strictEqual(
        this.pausableValidator.address,
        pvResult,
      );

      const pauseState = await this.pausableValidator.paused.call();
      assert.isFalse(pauseState, 'should start unpaused');
    });

    it('pausibleValidator should control trading', async () => {
      await this.proxiedToken.transfer(to, 1, { from: tokenOwner });
      sentByTokenOwner++;
      this.tokenOwnerBalance = await this.proxiedToken.balanceOf.call(tokenOwner);
      assert.equal(this.tokenOwnerBalance.toNumber(), initialSupply - sentByTokenOwner);

      this.toBalance = await this.proxiedToken.balanceOf.call(to);
      assert.equal(this.toBalance.toNumber(), 1);

      await this.pausableValidator.pause({ from: tokenOwner });
      let pauseState = await this.pausableValidator.paused.call();
      assert.isTrue(pauseState, 'should start unpaused');

      // Show con't transfer when paused
      await expectThrow(
        this.proxiedToken.transfer(to, 1, { from: tokenOwner }),
        'Should throw for transfer when paused',
      );
      this.tokenOwnerBalance = await this.proxiedToken.balanceOf.call(tokenOwner);
      assert.equal(this.tokenOwnerBalance.toNumber(), initialSupply - sentByTokenOwner);

      this.toBalance = await this.proxiedToken.balanceOf.call(to);
      assert.equal(this.toBalance.toNumber(), 1);

      // unpause
      await this.pausableValidator.unpause({ from: tokenOwner });
      pauseState = await this.pausableValidator.paused.call();
      assert.isFalse(pauseState, 'should be unpaused');
    });

    it('it should add a whitelistValidator', async () => {
      // Add Whitelist Validator
      this.whitelistValidator = await WhitelistValidator.new(
        { from: tokenOwner },
      );
      await this.proxiedToken.addModule(
        this.whitelistValidator.address,
        { from: tokenOwner },
      );

      const wlResult = await this.proxiedToken.getModuleByTypeAndIndex.call(
        TRANSFER_VALIDATOR_TYPE, 1,
      );

      assert.strictEqual(
        this.whitelistValidator.address,
        wlResult,
      );
    });

    it('whitelistValidator should control trading', async () => {
      // Add tokenOwner Address to Whitelist
      await this.whitelistValidator.addAddress(tokenOwner, { from: tokenOwner });

      const isTokenOwnerWhitelisted = await this.whitelistValidator.isWhitelisted.call(tokenOwner);
      assert.isTrue(isTokenOwnerWhitelisted, 'TokenOwner not Whitelisted');

      let isToWhitelisted = await this.whitelistValidator.isWhitelisted.call(to);
      assert.isFalse(isToWhitelisted, 'To Whitelisted');

      // Can't transfer to non-Whitelisted Address
      await expectThrow(
        this.proxiedToken.transfer(to, 1, { from: tokenOwner }),
        'Should throw for transfer when paused',
      );
      this.tokenOwnerBalance = await this.proxiedToken.balanceOf.call(tokenOwner);
      assert.equal(this.tokenOwnerBalance.toNumber(), initialSupply - sentByTokenOwner);

      this.toBalance = await this.proxiedToken.balanceOf.call(to);
      assert.equal(this.toBalance.toNumber(), 1);

      await this.whitelistValidator.addAddress(to, { from: tokenOwner });

      isToWhitelisted = await this.whitelistValidator.isWhitelisted.call(to);
      assert.isTrue(isToWhitelisted, 'To Not Whitelisted');

      // Can transfer to Whitelisted Address
      await this.proxiedToken.transfer(to, 1, { from: tokenOwner }),
      sentByTokenOwner++;

      this.tokenOwnerBalance = await this.proxiedToken.balanceOf.call(tokenOwner);
      assert.equal(this.tokenOwnerBalance.toNumber(), initialSupply - sentByTokenOwner);

      this.toBalance = await this.proxiedToken.balanceOf.call(to);
      assert.equal(this.toBalance.toNumber(), 2);
    });

    describe('Before Upgrade - Swap AssetTokens for SimpleTokens', () => {
      it('both Maker and Taker should be on ProxiedToken Whitelist', async () => {
        //  First put the Taker on the ProxiedToken Whitelist
        await this.whitelistValidator.addAddress(maker, { from: tokenOwner });
        await this.whitelistValidator.addAddress(taker, { from: tokenOwner });

        const isTakerWhitelisted = await this.whitelistValidator.isWhitelisted.call(taker);
        assert.isTrue(isTakerWhitelisted, 'Taker not Whitelisted');

        const isMakerWhitelisted = await this.whitelistValidator.isWhitelisted.call(maker);
        assert.isTrue(isMakerWhitelisted, 'Maker not Whitelisted');
      });

      it('Maker should have correct balances before', async () => {
        const makerSimpleBalance = await this.simpleToken.balanceOf.call(maker);
        assert.equal(makerSimpleBalance.toNumber(), 0, 'Maker should have 0 SimpleToken to Start');

        await this.proxiedToken.transfer(maker, 1000, { from: tokenOwner });

        const makerAssetTokenBalance = await this.proxiedToken.balanceOf.call(maker);
        assert.equal(makerAssetTokenBalance.toNumber(), 1000, 'Maker should have 1000 AssetToken to Start');
      });

      it('Taker should have correct balances before', async () => {
        const traderSimpleBalance = await this.simpleToken.balanceOf.call(taker);
        assert.equal(
          traderSimpleBalance.toNumber(),
          simpleTokenTotalSupply.toNumber(),
          'Trader should have All SimpleToken to Start',
        );

        const takerAssetTokenBalance = await this.proxiedToken.balanceOf.call(taker);
        assert.equal(takerAssetTokenBalance.toNumber(), 0, 'Taker should have 0 AssetToken to Start');
      });

      it('it should swap 1 AssetToken for 1 SimpleToken', async () => {
        // Swap ProxiedToken for SimpleToken
        // Set up approvals
        await this.proxiedToken.approve(this.exchange.address, 1, { from: maker });
        await this.simpleToken.approve(this.exchange.address, 1, { from: taker });

        // Order parameters.
        const makerAddress = maker;
        const makerAmount = 1;
        const makerToken = this.proxiedToken.address;
        const takerAddress = taker;
        const takerAmount = 1;
        const takerToken = this.simpleToken.address;
        const expiration = new Date().getTime() + 60000;
        const nonce = 1;

        const args = [makerAddress, makerAmount, makerToken,
          takerAddress, takerAmount, takerToken, expiration, nonce];
        const argTypes = ['address', 'uint', 'address', 'address',
          'uint', 'address', 'uint256', 'uint256'];

        const msg = ABI.soliditySHA3(argTypes, args);

        const sig = web3.eth.sign(makerAddress, util.bufferToHex(msg));
        const { v, r, s } = util.fromRpcSig(sig);

        const tx = await this.exchange.fill(
          makerAddress, makerAmount, makerToken,
          takerAddress, takerAmount, takerToken,
          expiration, nonce, v, util.bufferToHex(r), util.bufferToHex(s),
          {
            from: takerAddress,
            gasLimit: web3.toHex(200000),
            gasPrice: web3.eth.gasPrice,
          },
        );
        assert.ok(tx.logs.find(log => log.event === 'Filled'));
      });

      it('Maker should have correct balances after', async () => {
        const makerSimpleBalance = await this.simpleToken.balanceOf.call(maker);
        assert.equal(makerSimpleBalance.toNumber(), 1, 'Maker should have 0 SimpleToken to Start');

        const makerAssetTokenBalance = await this.proxiedToken.balanceOf.call(maker);
        assert.equal(makerAssetTokenBalance.toNumber(), 999, 'Maker should have 1000 AssetToken to Start');
      });

      it('Taker should have correct balances after', async () => {
        const traderSimpleBalance = await this.simpleToken.balanceOf.call(taker);
        assert.equal(
          traderSimpleBalance.toNumber(),
          simpleTokenTotalSupply.toNumber() - 1,
          'Trader should have All SimpleToken to Start',
        );

        const takerAssetTokenBalance = await this.proxiedToken.balanceOf.call(taker);
        assert.equal(takerAssetTokenBalance.toNumber(), 1, 'Taker should have 0 AssetToken to Start');
      });
    });

    it('it should upgrade Asset Token and maintain previous functionality', async () => {
      // Upgrade to Versionable Asset Token
      const verionedAssetToken = await VersionableAssetTokenMockAbstraction.new({ from: adminOwner });

      await this.proxy.upgradeToAndCall(verionedAssetToken.address, initializeDataV1, { from: tokenOwner });

      const implAddressV1 = await this.proxy.implementation.call();
      assert.equal(implAddressV1, verionedAssetToken.address, 'Impl address incorrect after upgrade');

      this.proxiedToken = await VersionableAssetTokenMockAbstraction.at(this.proxy.address);

      // Check Balances
      const tokenOwnerBalanceCheck = await this.proxiedToken.balanceOf.call(tokenOwner);
      assert.equal(tokenOwnerBalanceCheck.toNumber(), this.tokenOwnerBalance.toNumber());

      const toBalanceCheck = await this.proxiedToken.balanceOf.call(to);
      assert.equal(toBalanceCheck.toNumber(), this.toBalance.toNumber());

      const adminOwnerBalanceCheck = await this.proxiedToken.balanceOf.call(adminOwner);
      assert.equal(adminOwnerBalanceCheck.toNumber(), this.adminOwnerBalance.toNumber());

      // Can still transfer to a whitelisted Address
      await this.proxiedToken.transfer(to, 1, { from: tokenOwner }),
      sentByTokenOwner++;

      this.tokenOwnerBalance = await this.proxiedToken.balanceOf.call(tokenOwner);
      assert.equal(this.tokenOwnerBalance.toNumber(), initialSupply - sentByTokenOwner);

      this.toBalance = await this.proxiedToken.balanceOf.call(to);
      assert.equal(this.toBalance.toNumber(), 3);

      // Still can't transfer to non-Whitelisted Address
      await expectThrow(
        this.proxiedToken.transfer(taker, 1, { from: tokenOwner }),
        'Should throw for transfer when paused',
      );
      this.tokenOwnerBalance = await this.proxiedToken.balanceOf.call(tokenOwner);
      assert.equal(this.tokenOwnerBalance.toNumber(), initialSupply - sentByTokenOwner);

      this.takerBalance = await this.proxiedToken.balanceOf.call(taker);
      assert.equal(this.takerBalance.toNumber(), 0);
    });

    describe('After Upgrade - Swap AssetTokens for SimpleTokens', () => {
      it('both Maker and Taker should be on ProxiedToken Whitelist', async () => {
        const isTakerWhitelisted = await this.whitelistValidator.isWhitelisted.call(taker);
        assert.isTrue(isTakerWhitelisted, 'Taker not Whitelisted');

        const isMakerWhitelisted = await this.whitelistValidator.isWhitelisted.call(maker);
        assert.isTrue(isMakerWhitelisted, 'Maker not Whitelisted');
      });

      it('Maker should have correct balances before', async () => {
        const makerSimpleBalance = await this.simpleToken.balanceOf.call(maker);
        assert.equal(makerSimpleBalance.toNumber(), 1, 'Maker should have 0 SimpleToken to Start');

        const makerAssetTokenBalance = await this.proxiedToken.balanceOf.call(maker);
        assert.equal(makerAssetTokenBalance.toNumber(), 999, 'Maker should have 1000 AssetToken to Start');
      });

      it('Taker should have correct balances before', async () => {
        const traderSimpleBalance = await this.simpleToken.balanceOf.call(taker);
        assert.equal(
          traderSimpleBalance.toNumber(),
          simpleTokenTotalSupply.toNumber() - 1,
          'Trader should have All SimpleToken to Start',
        );

        const takerAssetTokenBalance = await this.proxiedToken.balanceOf.call(taker);
        assert.equal(takerAssetTokenBalance.toNumber(), 1, 'Taker should have 0 AssetToken to Start');
      });

      it('it should swap 1 AssetToken for 1 SimpleToken', async () => {
        // Swap ProxiedToken for SimpleToken
        // Set up approvals
        await this.proxiedToken.approve(this.exchange.address, 1, { from: maker });
        await this.simpleToken.approve(this.exchange.address, 1, { from: taker });

        // Order parameters.
        const makerAddress = maker;
        const makerAmount = 1;
        const makerToken = this.proxiedToken.address;
        const takerAddress = taker;
        const takerAmount = 1;
        const takerToken = this.simpleToken.address;
        const expiration = new Date().getTime() + 60000;
        const nonce = 1;

        const args = [makerAddress, makerAmount, makerToken,
          takerAddress, takerAmount, takerToken, expiration, nonce];
        const argTypes = ['address', 'uint', 'address', 'address',
          'uint', 'address', 'uint256', 'uint256'];

        const msg = ABI.soliditySHA3(argTypes, args);

        const sig = web3.eth.sign(makerAddress, util.bufferToHex(msg));
        const { v, r, s } = util.fromRpcSig(sig);

        const tx = await this.exchange.fill(
          makerAddress, makerAmount, makerToken,
          takerAddress, takerAmount, takerToken,
          expiration, nonce, v, util.bufferToHex(r), util.bufferToHex(s),
          {
            from: takerAddress,
            gasLimit: web3.toHex(200000),
            gasPrice: web3.eth.gasPrice,
          },
        );
        assert.ok(tx.logs.find(log => log.event === 'Filled'));
      });

      it('Maker should have correct balances after', async () => {
        const makerSimpleBalance = await this.simpleToken.balanceOf.call(maker);
        assert.equal(makerSimpleBalance.toNumber(), 2, 'Maker should have 0 SimpleToken to Start');

        const makerAssetTokenBalance = await this.proxiedToken.balanceOf.call(maker);
        assert.equal(makerAssetTokenBalance.toNumber(), 998, 'Maker should have 1000 AssetToken to Start');
      });

      it('Taker should have correct balances after', async () => {
        const traderSimpleBalance = await this.simpleToken.balanceOf.call(taker);
        assert.equal(
          traderSimpleBalance.toNumber(),
          simpleTokenTotalSupply.toNumber() - 2,
          'Trader should have All SimpleToken to Start',
        );

        const takerAssetTokenBalance = await this.proxiedToken.balanceOf.call(taker);
        assert.equal(takerAssetTokenBalance.toNumber(), 2, 'Taker should have 0 AssetToken to Start');
      });
    });
  });
});
