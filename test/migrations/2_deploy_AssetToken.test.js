/* eslint max-len:0 */
const AssetTokenAbstraction = artifacts.require('AssetToken');

contract('deploy_AssetToken', function (accounts) {
  const expectedContractArgs = {
    owner: accounts[0],
    initialAmount: 0,
    name: 'Meridio Instance',
    decimalUnits: 1,
    symbol: 'MER-v1',
  };

  before(async () => {
    this.deployed = await AssetTokenAbstraction.deployed();
  });

  describe('Deployed', () => {
    it('it should deploy the AssetToken contract to the network', async () => {
      assert.isNotNull(this.deployed, 'The contract was not deployed');
    });
  });

  describe('Initialized', () => {
    it('it should initialize the AssetToken contract and set owner', async () => {
      const setOwner = await this.deployed.owner.call();
      assert.equal(setOwner, expectedContractArgs.owner, 'Owner not set correctly');
    });

    it('it should initialize the AssetToken contract and set totalSupply', async () => {
      const setTotalSupply = await this.deployed.totalSupply.call();
      assert.equal(setTotalSupply.toNumber(), expectedContractArgs.initialAmount, 'totalSupply not set correctly');
    });

    it('it should initialize the AssetToken contract and set owner balance', async () => {
      const ownerBalance = await this.deployed.balanceOf.call(expectedContractArgs.owner);
      assert.equal(ownerBalance.toNumber(), expectedContractArgs.initialAmount, 'owner Balance not set correctly');
    });

    it('it should initialize the AssetToken contract and set name', async () => {
      const setName = await this.deployed.name.call();
      assert.equal(setName, expectedContractArgs.name, 'name not set correctly');
    });

    it('it should initialize the AssetToken contract and set decimals', async () => {
      const setDecimals = await this.deployed.decimals.call();
      assert.equal(setDecimals.toNumber(), expectedContractArgs.decimalUnits, 'Decimals not set correctly');
    });

    it('it should initialize the AssetToken contract and set symbol', async () => {
      const setSymbol = await this.deployed.symbol.call();
      assert.equal(setSymbol, expectedContractArgs.symbol, 'Symbol not set correctly');
    });
  });
});
