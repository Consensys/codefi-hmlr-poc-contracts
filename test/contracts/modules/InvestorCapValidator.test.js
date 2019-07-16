/* eslint max-len:0 */
const { expectThrow } = require('../../utils');

const InvestorCapValidatorAbstraction = artifacts.require('InvestorCapValidator');
const SimpleToken = artifacts.require('SimpleToken');

contract('InvestorCapValidator', function (accounts) {
  const from = accounts[0];
  const investor1 = accounts[1];
  let instance;
  const investorCap = 100;

  beforeEach(async () => {
    instance = await InvestorCapValidatorAbstraction.new(investorCap, { from });
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
    const TRANSFER_VALIDATOR_NAME = 'InvestorCapValidator';

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

  describe('.investorCap()', () => {
    it('should get the correct investorCap', async () => {
      const setInvestorCap = await instance.investorCap.call();
      assert.strictEqual(setInvestorCap.toNumber(), investorCap);
    });
  });

  describe('.investorCount()', () => {
    it('should get the correct investorCount', async () => {
      const setInvestorCount = await instance.investorCount.call(from);
      assert.strictEqual(setInvestorCount.toNumber(), 0);
    });
  });

  describe('.getRemainingInvestors()', () => {
    it('should get the correct getRemainingInvestors', async () => {
      const remainingInvestors = await instance.getRemainingInvestors.call(from);
      assert.strictEqual(remainingInvestors.toNumber(), investorCap - 0);
    });
  });

  describe('.overrideInvestorCount()', async () => {
    const newInvestorCount = 1;

    it('allows owner to change investorCount', async () => {
      const errMsg = 'InvestorCount not changed';
      const receipt = await instance.overrideInvestorCount(from, newInvestorCount, { from });
      const event = receipt.logs[0];
      const eventName = receipt.logs[0].event;
      assert.strictEqual(eventName, 'LogInvestorCountOverride');
      assert.strictEqual(event.args.sender, from);
      assert.strictEqual(event.args.investment, from);
      assert.strictEqual(event.args.newInvestorCount.toNumber(), newInvestorCount);
      const setInvestorCount = await instance.investorCount.call(from);
      assert.equal(setInvestorCount.toNumber(), newInvestorCount, errMsg);
    });

    it('allows owner to change investorCount to more than current investorCap', async () => {
      const errMsg = 'InvestorCount not changed';
      const overInvestorCap = investorCap + 1;
      const receipt = await instance.overrideInvestorCount(from, overInvestorCap, { from });
      const event = receipt.logs[0];
      const eventName = receipt.logs[0].event;
      assert.strictEqual(eventName, 'LogInvestorCountOverride');
      assert.strictEqual(event.args.sender, from);
      assert.strictEqual(event.args.investment, from);
      assert.strictEqual(event.args.newInvestorCount.toNumber(), overInvestorCap);
      const setInvestorCount = await instance.investorCount.call(from);
      assert.equal(setInvestorCount.toNumber(), overInvestorCap, errMsg);
    });

    it('does not allow non-owner to change investorCount', async () => {
      const errMsg = 'It should not allow a non-owner to change investorCount';
      await expectThrow(
        instance.overrideInvestorCount(from, newInvestorCount, { from: investor1 }),
        errMsg,
      );
    });
    it('does not change InvestorCount when paused', async () => {
      const errMsg = 'It should not allow changing InvestorCount when paused';
      await instance.pause({ from });
      const paused = await instance.paused.call();
      assert.strictEqual(paused, true, 'should be paused');
      await expectThrow(
        instance.overrideInvestorCount(from, newInvestorCount, { from }),
        errMsg,
      );
    });
  });

  describe('.setInvestorCap()', async () => {
    const newInvestorCap = 1000;

    it('allows owner to change investorCap', async () => {
      const errMsg = 'InvestorCap not changed';
      const receipt = await instance.setInvestorCap(newInvestorCap, { from });
      const event = receipt.logs[0];
      const eventName = receipt.logs[0].event;
      assert.strictEqual(eventName, 'LogSetInvestorCap');
      assert.strictEqual(event.args.sender, from);
      assert.strictEqual(event.args.newInvestorCap.toNumber(), newInvestorCap);
      const setInvestorCap = await instance.investorCap.call();
      assert.equal(setInvestorCap.toNumber(), newInvestorCap, errMsg);
    });

    it('allows owner to change investorCap to less than current investors', async () => {
      const errMsg = 'InvestorCap not changed';
      await instance.overrideInvestorCount(from, investorCap, { from });
      const underInvestorCount = investorCap - 1;
      const receipt = await instance.setInvestorCap(underInvestorCount, { from });
      const event = receipt.logs[0];
      const eventName = receipt.logs[0].event;
      assert.strictEqual(eventName, 'LogSetInvestorCap');
      assert.strictEqual(event.args.sender, from);
      assert.strictEqual(event.args.newInvestorCap.toNumber(), underInvestorCount);
      const setInvestorCap = await instance.investorCap.call();
      assert.equal(setInvestorCap.toNumber(), underInvestorCount, errMsg);
    });

    it('does not allow non-owner to change investorCap', async () => {
      const errMsg = 'It should not allow a non-owner to change investorCap';
      await expectThrow(
        instance.setInvestorCap(newInvestorCap, { from: investor1 }),
        errMsg,
      );
    });

    it('does not change InvestorCap when paused', async () => {
      const errMsg = 'It should not allow changing InvestorCap when paused';
      await instance.pause({ from });
      const paused = await instance.paused.call();
      assert.strictEqual(paused, true, 'should be paused');
      await expectThrow(
        instance.setInvestorCap(newInvestorCap, { from }),
        errMsg,
      );
    });
  });

  describe('.canSend()', async () => {
    beforeEach(async () => {
      this.token = await SimpleToken.new({ from });
      await instance.overrideInvestorCount(from, 1, { from }); // to reflect that the from gets the initial Tokens
    });

    it('it increases InvestorCount and returns true when investor is new but count will be less or equal to cap', async () => {
      const errMsg = 'It should report true for increase count but less than cap';
      const amount = 1;
      // using `from` address here because the `canSend` will use msg.sender
      // to keep track of the investor count not the passed in token address
      const preCount = await instance.investorCount.call(from);
      const remainingInvestors = await instance.getRemainingInvestors.call(from);
      assert.isAtLeast(remainingInvestors.toNumber(), 1);
      const toBalance = await this.token.balanceOf(investor1);
      assert.equal(toBalance.toNumber(), 0);
      const result = await instance.canSend.call(
        this.token.address,
        from,
        investor1,
        amount,
      );
      assert.isTrue(result, errMsg);
      // now actually run the validate to change state
      await instance.canSend(
        this.token.address,
        from,
        investor1,
        amount,
        { from },
      );
      const postCount = await instance.investorCount.call(from);
      assert.equal(postCount.toNumber(), preCount.toNumber() + 1);
    });

    it('it returns true when investor is not new and from will not have zero', async () => {
      const errMsg = 'It should report true when investor is not new and from will not have zero';
      await this.token.transfer(investor1, 1, { from });
      await instance.overrideInvestorCount(from, 2, { from }); // to reflect that the investor1 Token
      const toBalance = await this.token.balanceOf(investor1);
      assert.equal(toBalance.toNumber(), 1);
      const result = await instance.canSend.call(
        this.token.address,
        from,
        investor1,
        1,
      );
      assert.isTrue(result, errMsg);
    });

    it('it decreases InvestorCount and returns true when investor is not new and from will have zero', async () => {
      const errMsg = 'It should report true when investor is not new and from will not have zero';
      await this.token.transfer(investor1, 1, { from });
      await instance.overrideInvestorCount(from, 2, { from }); // to reflect that the investor1 Token

      const preCount = await instance.investorCount.call(from);
      assert.equal(preCount.toNumber(), 2);

      const fromBalance = await this.token.balanceOf(from);
      const toBalance = await this.token.balanceOf(investor1);
      assert.equal(toBalance.toNumber(), 1);
      const result = await instance.canSend.call(
        this.token.address,
        from,
        investor1,
        fromBalance.toNumber(),
      );
      assert.isTrue(result, errMsg);
      // now actually run the validate to change state
      await instance.canSend(
        this.token.address,
        from,
        investor1,
        fromBalance.toNumber(),
        { from },
      );
      const postCount = await instance.investorCount.call(from);
      assert.equal(postCount.toNumber(), preCount.toNumber() - 1);
    });

    it('it returns true when investor is new and cap is reached but from will have zero', async () => {
      const errMsg = 'It should report true when investor is new and cap is reached but from will have zero';
      const fromBalance = await this.token.balanceOf(from);
      await instance.setInvestorCap(1, { from });
      const remainingInvestors = await instance.getRemainingInvestors.call(from);
      assert.equal(remainingInvestors.toNumber(), 0);
      const toBalance = await this.token.balanceOf(investor1);
      assert.equal(toBalance.toNumber(), 0);
      const result = await instance.canSend.call(
        this.token.address,
        from,
        investor1,
        fromBalance.toNumber(),
      );
      assert.isTrue(result, errMsg);
    });

    it('it returns false when investor is new but count will be more than cap', async () => {
      const errMsg = 'It should report false for increase count and more than cap';
      const amount = 1;
      const preCount = await instance.investorCount.call(from);
      await instance.setInvestorCap(preCount.toNumber(), { from });

      const remainingInvestors = await instance.getRemainingInvestors.call(from);
      assert.equal(remainingInvestors.toNumber(), 0);

      const toBalance = await this.token.balanceOf(investor1);
      assert.equal(toBalance.toNumber(), 0);

      const result = await instance.canSend.call(
        this.token.address,
        from,
        investor1,
        amount,
      );
      assert.isFalse(result, errMsg);
      // now actually run the validate to test state changes
      await instance.canSend(
        this.token.address,
        from,
        investor1,
        amount,
        { from },
      );
      const postCount = await instance.investorCount.call(from);
      assert.equal(postCount.toNumber(), preCount.toNumber());
    });

    it('it cannot decrease InvestorCount below 0', async () => {
      const errMsg = 'It should prevent decreasing investorCount below 0';
      // Investor will not be a new Investor
      await this.token.transfer(investor1, 1, { from });

      // artificially set our investorCount to 0
      await instance.overrideInvestorCount(from, 0, { from });
      const preCount = await instance.investorCount.call(from);
      assert.equal(preCount.toNumber(), 0);

      const fromBalance = await this.token.balanceOf(from);
      const toBalance = await this.token.balanceOf(investor1);
      assert.equal(toBalance.toNumber(), 1);

      await expectThrow(
        instance.canSend.call(
          this.token.address,
          from,
          investor1,
          fromBalance.toNumber(),
        ),
        errMsg,
      );
    });
  });
});
