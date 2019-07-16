/* eslint max-len:0 */
const ExchangeAbstraction = artifacts.require('Exchange');

contract('deploy_Exchange', function (accounts) {
  const expectedContractArgs = {
  };

  before(async () => {
    this.deployed = await ExchangeAbstraction.deployed();
  });

  describe('Deployed', () => {
    it('it should deploy the Exchange contract to the network', async () => {
      assert.isNotNull(this.deployed, 'The contract was not deployed');
    });
  });
});
