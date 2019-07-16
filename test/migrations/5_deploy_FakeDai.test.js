/* eslint max-len:0 */
const FakeDaiAbstraction = artifacts.require('./mocks/DSToken');

contract('deploy_FakeDai', function (accounts) {
  const expectedContractArgs = {
    owner: accounts[0],
    initialMinting: 1000000000000000000000000000,
    symbol: web3.fromAscii('DAI'),
    name: web3.fromAscii('Dai'),
    stopped: false,
  };

  before(async () => {
    this.deployed = await FakeDaiAbstraction.deployed();
  });

  describe('Deployed', () => {
    it('it should deploy the FakeDai contract to the network', async () => {
      assert.isNotNull(this.deployed, 'The contract was not deployed');
    });
  });

  describe('Initialized', () => {
    it('it should initialize the FakeDai contract and set owner', async () => {
      const setOwner = await this.deployed.owner.call();
      assert.equal(setOwner, expectedContractArgs.owner, 'Owner not set correctly');
    });

    it('it should initialize the FakeDai contract and set stopped to false', async () => {
      const stopped = await this.deployed.stopped.call();
      assert.equal(stopped, expectedContractArgs.stopped, 'stopped not set correctly');
    });

    it('it should initialize the FakeDai contract and set name', async () => {
      const setName = await this.deployed.name.call();
      assert.equal(
        setName.substring(0, expectedContractArgs.name.length),
        expectedContractArgs.name,
        'name not set correctly',
      );
    });

    it('it should initialize the FakeDai contract and set symbol', async () => {
      const setSymbol = await this.deployed.symbol.call();
      assert.equal(
        setSymbol.substring(0, expectedContractArgs.symbol.length),
        expectedContractArgs.symbol,
        'Symbol not set correctly',
      );
    });

    it('it should initialize the AssetToken contract and mint to owner balance', async () => {
      const ownerBalance = await this.deployed.balanceOf.call(expectedContractArgs.owner);
      assert.equal(ownerBalance.toNumber(), expectedContractArgs.initialMinting, 'owner Balance not minted correctly');
    });
  });
});
