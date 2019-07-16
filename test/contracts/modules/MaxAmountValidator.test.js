/* eslint max-len:0 */
const { expectThrow } = require('../../utils');

const MaxAmountValidatorAbstraction = artifacts.require('MaxAmountValidator');
const SimpleToken = artifacts.require('SimpleToken');

contract('MaxAmountValidator', function (accounts) {
  const from = accounts[0];
  const investor1 = accounts[1];
  let instance;
  const maxAmount = 100000000000000000;

  beforeEach(async () => {
    instance = await MaxAmountValidatorAbstraction.new(maxAmount, { from });
  });

  describe('is Ownable', () => {
    it('should set the owner', async () => {
      const owner = await instance.owner.call();
      assert.strictEqual(owner, from);
    });
  });

  describe('is Pausable', () => {
    it('should set to unpaused', async () => {
      const paused = await instance.paused.call();
      assert.strictEqual(paused, false, 'should start unpaused');
    });
  });

  describe('.getName()', () => {
    const TRANSFER_VALIDATOR_NAME = 'MaxAmountValidator';

    it('should get the correct name', async () => {
      const name = await instance.getName.call();
      assert.strictEqual(
        TRANSFER_VALIDATOR_NAME,
        web3._extend.utils.toAscii(name).replace(/\0/g, ''),
      );
    });
  });

  describe('.getType()', () => {
    const TRANSFER_VALIDATOR_TYPE = 1;

    it('should get the correct type', async () => {
      const type = await instance.getType.call();
      assert.strictEqual(TRANSFER_VALIDATOR_TYPE, type.toNumber());
    });
  });

  describe('.maxAmount()', () => {
    it('should get the correct maxAmount', async () => {
      const setMaxAmountValidator = await instance.maxAmount.call();
      assert.strictEqual(setMaxAmountValidator.toNumber(), maxAmount);
    });
  });

  describe('.setMaxAmount()', async () => {
    const newMaxAmount = 1000;

    it('allows owner to change maxAmount', async () => {
      const errMsg = 'MaxAmount not changes';
      const receipt = await instance.setMaxAmount(newMaxAmount, { from });
      const event = receipt.logs[0];
      const eventName = receipt.logs[0].event;
      assert.strictEqual(eventName, 'LogChangeMaxAmount');
      assert.strictEqual(event.args.sender, from);
      assert.strictEqual(event.args.maxAmount.toNumber(), newMaxAmount);
      const setMaxAmount = await instance.maxAmount.call();
      assert.equal(setMaxAmount.toNumber(), newMaxAmount, errMsg);
    });
    it('does not allow non-owner to change maxAmount', async () => {
      const errMsg = 'It should not allow a non-owner to change maxAmount';
      await expectThrow(
        instance.setMaxAmount(newMaxAmount, { from: investor1 }),
        errMsg,
      );
    });
    it('does not change MaxAmount when paused', async () => {
      const errMsg = 'It should not allow changing MaxAmount when paused';
      await instance.pause({ from });
      const paused = await instance.paused.call();
      assert.strictEqual(paused, true, 'should be paused');
      await expectThrow(
        instance.setMaxAmount(newMaxAmount, { from: investor1 }),
        errMsg,
      );
    });
  });

  describe('.canSend()', async () => {
    beforeEach(async () => {
      this.token = await SimpleToken.new({ from });
    });

    it('it returns true when the _to balance + _amount LESS THAN maxAmount', async () => {
      const errMsg = 'It should report true for _amount';
      const amount = 1;
      const toBalance = await this.token.balanceOf(investor1);
      assert.isBelow(toBalance.toNumber() + amount, maxAmount);
      const result = await instance.canSend.call(
        this.token.address,
        from,
        investor1,
        amount,
      );
      assert.isTrue(result, errMsg);
    });

    it('it returns false when the _to balance + _amount EQUAL TO maxAmount', async () => {
      const errMsg = 'It should report true for _amount that would take us to equal maxAmount';
      const amount = 1;
      const toBalance = await this.token.balanceOf(investor1);

      await instance.setMaxAmount(toBalance.toNumber() + amount, { from });
      const nowMaxAmt = await instance.maxAmount.call();
      assert.equal(nowMaxAmt.toNumber(), toBalance.toNumber() + amount);

      const result = await instance.canSend.call(
        this.token.address,
        from,
        investor1,
        amount,
      );
      assert.isTrue(result, errMsg);
    });

    it('it returns false when the _to balance + _amount GREATER THAN maxAmount', async () => {
      const errMsg = 'It should report false for _amount that would take over maxAmount';
      const amount = 1;
      const toBalance = await this.token.balanceOf(investor1);

      await instance.setMaxAmount(amount, { from });
      const nowMaxAmt = await instance.maxAmount.call();
      assert.isBelow(nowMaxAmt.toNumber(), toBalance.toNumber() + amount * 2);

      const result = await instance.canSend.call(
        this.token.address,
        from,
        investor1,
        amount * 2,
      );
      assert.isFalse(result, errMsg);
    });
  });
});
