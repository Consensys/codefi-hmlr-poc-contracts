/* eslint max-len:0 */
const ProxyTokenFactoryAbstraction = artifacts.require('ProxyTokenFactory');

contract('deploy_ProxyTokenFactory', function (accounts) {
  const expectedContractArgs = {
    owner: accounts[0],
    paused: false,
  };

  before(async () => {
    this.deployed = await ProxyTokenFactoryAbstraction.deployed();
  });

  describe('Deployed', () => {
    it('it should deploy the ProxyTokenFactory contract to the network', async () => {
      assert.isNotNull(this.deployed, 'The contract was not deployed');
    });
  });

  describe('Initialized', () => {
    it('it should initialize the ProxyTokenFactory contract and set owner', async () => {
      const setOwner = await this.deployed.owner.call();
      assert.equal(setOwner, expectedContractArgs.owner, 'Owner not set correctly');
    });

    it('it should initialize the ProxyTokenFactory contract and set paused to false', async () => {
      const paused = await this.deployed.paused.call();
      assert.equal(paused, expectedContractArgs.paused, 'paused not set correctly');
    });
  });
});
