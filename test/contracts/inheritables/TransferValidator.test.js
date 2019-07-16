/* eslint max-len:0 */
const TransferValidatorMockAbstraction = artifacts.require('TransferValidatorMock');

contract('TransferValidator', (accounts) => {
  const owner = accounts[0];
  const TRANSFER_VALIDATOR_TYPE = 1;
  let M;

  beforeEach(async () => {
    M = await TransferValidatorMockAbstraction.new({ from: owner });
  });

  describe('constant - moduleType', () => {
    it('it should set moduleType as 1', async () => {
      const errMsg = 'Wrong moduleType set as constant';
      const result = await M.getType.call();

      assert.equal(result.toNumber(), TRANSFER_VALIDATOR_TYPE, errMsg);
    });
  });
});
