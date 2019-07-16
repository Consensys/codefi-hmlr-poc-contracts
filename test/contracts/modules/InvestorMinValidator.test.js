/* eslint max-len:0 */
const { expectThrow } = require('../../utils');

const InvestorMinValidatorAbstraction = artifacts.require('InvestorMinValidator');
const SimpleToken = artifacts.require('SimpleToken');

contract('InvestorMinValidator', function (accounts) {
  const from = accounts[0];
  const investor1 = accounts[1];
  let instance;
  const investorMin = 2;

  beforeEach(async () => {
    instance = await InvestorMinValidatorAbstraction.new(investorMin, { from });
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
    const TRANSFER_VALIDATOR_NAME = 'InvestorMinValidator';

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

  describe('.investorMin()', () => {
    it('should get the correct investorMin for address', async () => {
      const setInvestorMin = await instance.investorMin.call();
      assert.strictEqual(setInvestorMin.toNumber(), investorMin);
    });
  });

  describe('.investorCount()', () => {
    it('should get the correct investorCount for address', async () => {
      const setInvestorCount = await instance.investorCount.call(from);
      assert.strictEqual(setInvestorCount.toNumber(), 0);
    });
  });

  describe('.overrideInvestorCount()', async () => {
    const newInvestorCount = 1;

    it('allows owner to change investorCount for an address', async () => {
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

    it('allows owner to change investorCount to less than current investorMin', async () => {
      const errMsg = 'InvestorCount not changed';
      const underInvestorMin = investorMin - 1;
      const receipt = await instance.overrideInvestorCount(from, underInvestorMin, { from });
      const event = receipt.logs[0];
      const eventName = receipt.logs[0].event;
      assert.strictEqual(eventName, 'LogInvestorCountOverride');
      assert.strictEqual(event.args.sender, from);
      assert.strictEqual(event.args.investment, from);
      assert.strictEqual(event.args.newInvestorCount.toNumber(), underInvestorMin);
      const setInvestorCount = await instance.investorCount.call(from);
      assert.equal(setInvestorCount.toNumber(), underInvestorMin, errMsg);
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

  describe('.setInvestorMin()', async () => {
    const newInvestorMin = 1000;

    it('allows owner to change investorMin for specified address', async () => {
      const errMsg = 'InvestorMin not changed';
      const receipt = await instance.setInvestorMin(newInvestorMin, { from });
      const event = receipt.logs[0];
      const eventName = receipt.logs[0].event;
      assert.strictEqual(eventName, 'LogSetInvestorMin');
      assert.strictEqual(event.args.sender, from);
      assert.strictEqual(event.args.newInvestorMin.toNumber(), newInvestorMin);
      const setInvestorMin = await instance.investorMin.call();
      assert.equal(setInvestorMin.toNumber(), newInvestorMin, errMsg);
    });

    it('allows owner to change investorMin to less than current investors', async () => {
      const errMsg = 'InvestorMin not changed';
      await instance.overrideInvestorCount(from, investorMin, { from });
      const underInvestorCount = investorMin - 1;
      const receipt = await instance.setInvestorMin(underInvestorCount, { from });
      const event = receipt.logs[0];
      const eventName = receipt.logs[0].event;
      assert.strictEqual(eventName, 'LogSetInvestorMin');
      assert.strictEqual(event.args.sender, from);
      assert.strictEqual(event.args.newInvestorMin.toNumber(), underInvestorCount);
      const setInvestorMin = await instance.investorMin.call();
      assert.equal(setInvestorMin.toNumber(), underInvestorCount, errMsg);
    });

    it('does not allow non-owner to change investorMin', async () => {
      const errMsg = 'It should not allow a non-owner to change investorMin';
      await expectThrow(
        instance.setInvestorMin(newInvestorMin, { from: investor1 }),
        errMsg,
      );
    });

    it('does not change InvestorMin when paused', async () => {
      const errMsg = 'It should not allow changing InvestorMin when paused';
      await instance.pause({ from });
      const paused = await instance.paused.call();
      assert.strictEqual(paused, true, 'should be paused');
      await expectThrow(
        instance.setInvestorMin(newInvestorMin, { from }),
        errMsg,
      );
    });
  });

  describe('.canSend()', async () => {
    let tokenSupply;
    beforeEach(async () => {
      this.token = await SimpleToken.new({ from });
      tokenSupply = await this.token.totalSupply.call();
      tokenSupply = tokenSupply.toNumber();
      await instance.overrideInvestorCount(from, 1, { from }); // to reflect that the from gets the initial Tokens
    });

    it('it increases InvestorCount for calling address and returns true when investor is new and from has balance remaining', async () => {
      const errMsg = 'It should report true for increase count and remaining from balance';
      const amount = 1;
      // using `from` address here because the `canSend` will use msg.sender
      // to keep track of the investor count not the passed in token address
      const preCount = await instance.investorCount.call(from);
      assert.equal(preCount.toNumber(), 1);
      const toBalance = await this.token.balanceOf(investor1);
      assert.equal(toBalance.toNumber(), 0);
      const fromBalance = await this.token.balanceOf(from);
      assert.equal(fromBalance.toNumber(), tokenSupply);
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

    it('it decreases InvestorCount and returns true when over min and investor is not new and from will have zero', async () => {
      const errMsg = 'It should report true when over min when investor is not new and from will not have zero';
      await this.token.transfer(investor1, 1, { from });
      await instance.overrideInvestorCount(from, 2, { from }); // to reflect that the investor1 Token
      await instance.setInvestorMin(1, { from });

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
      );
      const postCount = await instance.investorCount.call(from);
      assert.equal(postCount.toNumber(), preCount.toNumber() - 1);
    });

    it('it returns false when investor is not new but count will be less than min', async () => {
      const errMsg = 'It should report false for decrease count and less than min';
      await this.token.transfer(investor1, 1, { from });
      await instance.overrideInvestorCount(from, 2, { from }); // to reflect that the investor1 Token

      const preCount = await instance.investorCount.call(from);
      await instance.setInvestorMin(preCount.toNumber(), { from });

      const toBalance = await this.token.balanceOf(investor1);
      assert.equal(toBalance.toNumber(), 1);

      const fromBalance = await this.token.balanceOf(from);

      const result = await instance.canSend.call(
        this.token.address,
        from,
        investor1,
        fromBalance.toNumber(),
      );
      assert.isFalse(result, errMsg);
      // now actually run the validate to test state changes
      await instance.canSend(
        this.token.address,
        from,
        investor1,
        fromBalance.toNumber(),
      );
      const postCount = await instance.investorCount.call(from);
      assert.equal(postCount.toNumber(), preCount.toNumber());
    });

    it('it cannot decrease InvestorCount below 0', async () => {
      const errMsg = 'It should prevent decreasing investorCount below 0';
      await this.token.transfer(investor1, 1, { from });
      await instance.setInvestorMin(0, { from });

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
