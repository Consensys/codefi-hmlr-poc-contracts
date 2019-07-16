/* eslint max-len:0 */
const MetadataStoreMockAbstraction = artifacts.require('MetadataStoreMock');

contract('MetadataStore', (accounts) => {
  const owner = accounts[0];
  const METADATA_STORE_TYPE = 2;
  let M;

  beforeEach(async () => {
    M = await MetadataStoreMockAbstraction.new({ from: owner });
  });

  describe('constant - moduleType', () => {
    it('it should set moduleType as 2', async () => {
      const errMsg = 'Wrong moduleType set as constant';
      const result = await M.getType.call();

      assert.equal(result.toNumber(), METADATA_STORE_TYPE, errMsg);
    });
  });
});
