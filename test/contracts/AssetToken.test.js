/* eslint max-len:0 */
const expectThrow = require('../utils.js').expectThrow;
const isEVMException = require('../utils.js').isEVMException;

const AssetTokenAbstraction = artifacts.require('AssetToken');

contract('AssetToken', function (accounts) {
  const owner = accounts[0];
  const to = accounts[1];
  const spender = accounts[2];
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  const initialSupply = 100000;
  const tokenName = 'ABC Property';
  const decimalUnits = 18;
  const tokenSymbol = 'ABC';

  beforeEach(async () => {
    this.token = await AssetTokenAbstraction.new({ from: owner });
    await this.token.initialize(
      owner,
      initialSupply,
      tokenName,
      decimalUnits,
      tokenSymbol,
      { from: owner },
    );
  });

  describe('Creation', () => {
    it('should create an initial bal of 100000 for the owner', async () => {
      const balance = await this.token.balanceOf.call(owner);
      assert.strictEqual(balance.toNumber(), initialSupply);
    });

    it('should create with the correct information', async () => {
      const owner = await this.token.owner.call();
      assert.strictEqual(owner, owner);

      const totalSupply = await this.token.totalSupply.call();
      assert.strictEqual(totalSupply.toNumber(), initialSupply);

      const name = await this.token.name.call();
      assert.strictEqual(name, tokenName);

      const decimals = await this.token.decimals.call();
      assert.strictEqual(decimals.toNumber(), decimalUnits);

      const symbol = await this.token.symbol.call();
      assert.strictEqual(symbol, tokenSymbol);

      const validatorType = await this.token.TRANSFER_VALIDATOR_TYPE.call();
      assert.strictEqual(validatorType.toNumber(), 1);
    });

    it('it should throw an error if initialized a second time', async () => {
      const errMsg = 'should not re-initialize';
      try {
        await this.token.initialize(
          owner,
          initialSupply,
          tokenName,
          decimalUnits,
          tokenSymbol,
          { from: owner },
        );
      } catch (e) {
        assert.isTrue(isEVMException(e), errMsg);
        return;
      }
      assert.isTrue(false, `${errMsg} - did not throw`);
    });

    it('it should not be able to create over 2^256 - 1 (max) tokens', async () => {
      const errMsg = 'It should throw when trying to create too many tokens';
      const token2 = await AssetTokenAbstraction.new({ from: owner });
      await expectThrow(
        token2.initialize(
          owner,
          '115792089237316195423570985008687907853269984665640564039457584007913129639936',
          tokenName,
          decimalUnits,
          tokenSymbol,
          { from: owner },
        ),
        errMsg,
      );
    });
    it('should be able to create 2^256 - 1 (max) tokens', async () => {
      const token2 = await AssetTokenAbstraction.new({ from: owner });
      await token2.initialize(
        owner,
        '115792089237316195423570985008687907853269984665640564039457584007913129639935',
        tokenName,
        decimalUnits,
        tokenSymbol,
        { from: owner },
      );
      const totalSupply = await token2.totalSupply();
      const match = totalSupply.equals('1.15792089237316195423570985008687907853269984665640564039457584007913129639935e+77');
      assert(match, 'result is not correct');
    });
  });

  describe('.totalSupply()', () => {
    it('returns the total amount of tokens', async () => {
      const totalSupply = await this.token.totalSupply();

      assert.equal(totalSupply, initialSupply);
    });
  });

  describe('balanceOf', () => {
    describe('when the requested account has no tokens', () => {
      it('returns zero', async () => {
        const balance = await this.token.balanceOf(to);

        assert.equal(balance, 0);
      });
    });

    describe('when the requested account has some tokens', () => {
      it('returns the total amount of tokens', async () => {
        const balance = await this.token.balanceOf(owner);

        assert.strictEqual(balance.toNumber(), initialSupply);
      });
    });
  });

  describe('.changeName()', () => {
    it('it should allow the owner to change the name', async () => {
      const errMsg = 'it should change the name for the owner';
      const beforeName = await this.token.name.call();
      const afterName = `${beforeName}New`;

      await this.token.changeName(afterName, { from: owner });
      const setName = await this.token.name.call();
      assert.equal(setName, afterName, errMsg);
    });
    it('it should not allow a non-owner to change the name', async () => {
      const errMsg = 'it should not change the name for a non-owner';
      const beforeName = await this.token.name.call();
      const afterName = `${beforeName}New`;

      try {
        await this.token.changeName(afterName, { from: to });
      } catch (e) {
        assert.isTrue(isEVMException(e), errMsg);
        return;
      }
      assert.fail('Expected throw not received');

      const setName = await this.token.name.call();
      assert.equal(setName, afterName, errMsg);
    });
    it('it should not allow name change before initialization', async () => {
      const errMsg = 'it should not change the name before it is initialized';
      const newInstance = await AssetTokenAbstraction.new({ from: owner });
      const beforeName = await newInstance.name.call();
      assert.equal(beforeName, '', 'Name should start empty');

      try {
        await newInstance.changeName(tokenName, { from: owner });
      } catch (e) {
        assert.isTrue(isEVMException(e), errMsg);
        return;
      }
      assert.fail('Expected throw not received');
    });
  });

  describe('.changeSymbol()', () => {
    it('it should allow the owner to change the symbol', async () => {
      const errMsg = 'it should change the symbol for the owner';
      const beforeSymbol = await this.token.symbol.call();
      const afterSymbol = `${beforeSymbol}New`;

      await this.token.changeSymbol(afterSymbol, { from: owner });
      const setSymbol = await this.token.symbol.call();
      assert.equal(setSymbol, afterSymbol, errMsg);
    });
    it('it should not allow a non-owner to change the symbol', async () => {
      const errMsg = 'it should not change the symbol for a non-owner';
      const beforeSymbol = await this.token.symbol.call();
      const afterSymbol = `${beforeSymbol}New`;

      try {
        await this.token.changeSymbol(afterSymbol, { from: to });
      } catch (e) {
        assert.isTrue(isEVMException(e), errMsg);
        return;
      }
      assert.fail('Expected throw not received');

      const setSymbol = await this.token.symbol.call();
      assert.equal(setSymbol, afterSymbol, errMsg);
    });
    it('it should not allow symbol change before initialization', async () => {
      const errMsg = 'it should not change the symbol before it is initialized';
      const newInstance = await AssetTokenAbstraction.new({ from: owner });
      const beforeSymbol = await newInstance.symbol.call();
      assert.equal(beforeSymbol, '', 'Symbol should start empty');

      try {
        await newInstance.changeSymbol(tokenSymbol, { from: owner });
      } catch (e) {
        assert.isTrue(isEVMException(e), errMsg);
        return;
      }
      assert.fail('Expected throw not received');
    });
  });

  describe('.transfer()', () => {
    it('should transfer 10000 to to with accounts[0] having 10000', async () => {
      await this.token.transfer(to, initialSupply, { from: accounts[0] });
      const balance = await this.token.balanceOf.call(to);
      assert.strictEqual(balance.toNumber(), initialSupply);
    });
    it('emits a transfer event', async () => {
      const { logs } = await this.token.transfer(to, initialSupply, { from: owner });

      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'Transfer');
      assert.equal(logs[0].args.from, owner);
      assert.equal(logs[0].args.to, to);
      assert(logs[0].args.value.eq(initialSupply));
    });
    it('should fail when trying to transfer more than account balance', async () => {
      const errMsg = 'should not transfer more than balance';
      const balanceBefore = await this.token.balanceOf.call(accounts[0]);
      assert.strictEqual(balanceBefore.toNumber(), initialSupply);
      const failingAmount = initialSupply + 1;
      try {
        await this.token.transfer(to, failingAmount, { from: accounts[0] });
      } catch (e) {
        assert.isTrue(isEVMException(e), errMsg);
        const balanceAfter = await this.token.balanceOf.call(accounts[0]);
        assert.strictEqual(balanceAfter.toNumber(), initialSupply);
        return;
      }
      assert.isTrue(false, `${errMsg} - did not throw`);
    });
    it('should fail when trying to transfer to address(0)', async () => {
      const errMsg = 'should not transfer to the zero address';
      const balanceZeroBefore = await this.token.balanceOf.call(ZERO_ADDRESS);
      assert.strictEqual(balanceZeroBefore.toNumber(), 0);
      await expectThrow(
        this.token.transfer(ZERO_ADDRESS, initialSupply, { from: owner }),
        errMsg,
      );
      const balanceAfter = await this.token.balanceOf.call(owner);
      assert.strictEqual(balanceAfter.toNumber(), initialSupply);
      const balanceZero = await this.token.balanceOf.call(ZERO_ADDRESS);
      assert.strictEqual(balanceZero.toNumber(), 0);
    });
    it('should fail when trying to transfer to contract address', async () => {
      const errMsg = 'should not transfer to contract address';
      const balanceZeroBefore = await this.token.balanceOf.call(this.token.address);
      assert.strictEqual(balanceZeroBefore.toNumber(), 0);
      await expectThrow(
        this.token.transfer(this.token.address, initialSupply, { from: owner }),
        errMsg,
      );
      const balanceAfter = await this.token.balanceOf.call(owner);
      assert.strictEqual(balanceAfter.toNumber(), initialSupply);
      const balanceZero = await this.token.balanceOf.call(this.token.address);
      assert.strictEqual(balanceZero.toNumber(), 0);
    });
  });

  describe('.approve()', () => {
    it('it should allow approval', async () => {
      const errMsg = 'it should approve the spender';
      const amount = 100;
      const { logs } = await this.token.approve(spender, amount, { from: owner });

      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'Approval');
      assert.equal(logs[0].args.owner, owner);
      assert.equal(logs[0].args.spender, spender);
      assert(logs[0].args.value.eq(amount));

      const allowance = await this.token.allowance(owner, spender);
      assert.equal(allowance.toNumber(), amount, errMsg);
    });
    it('on second approval it should allow and replace amount', async () => {
      const errMsg = 'it should approve the spender and replace amount';
      const amount = 1;
      await this.token.approve(spender, amount, { from: owner });

      const allowance = await this.token.allowance(owner, spender);
      assert.equal(allowance.toNumber(), amount, 'initial approval incorrect');

      const amount1 = amount + 1;

      await this.token.approve(spender, amount1, { from: owner });

      const allowance1 = await this.token.allowance(owner, spender);
      assert.equal(allowance1.toNumber(), amount1, errMsg);
    });
    it('it should allow approval over owner balance', async () => {
      const errMsg = 'it should approve the spender';
      const amount = initialSupply + 1;
      await this.token.approve(spender, amount, { from: owner });

      const allowance = await this.token.allowance(owner, spender);
      assert.equal(allowance.toNumber(), amount, errMsg);
    });
  });

  describe('.decreaseApproval()', () => {
    const amount = 100;

    beforeEach(async () => {
      await this.token.approve(spender, amount, { from: owner });
    });
    it('it should reduce spender\'s allowance', async () => {
      const { logs } = await this.token.decreaseApproval(spender, amount, { from: owner });

      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'Approval');
      assert.equal(logs[0].args.owner, owner);
      assert.equal(logs[0].args.spender, spender);
      assert(logs[0].args.value.eq(0));

      const allowance = await this.token.allowance(owner, spender);
      assert.equal(allowance, 0);
    });
    it('on second approval it should reduce to difference', async () => {
      await this.token.approve(spender, amount + 1, { from: owner });
      await this.token.decreaseApproval(spender, amount, { from: owner });

      const allowance = await this.token.allowance(owner, spender);
      assert.equal(allowance.toNumber(), 1);
    });
    it('decreases Approval to 0 when sent more than approval', async () => {
      const preAllowance = await this.token.allowance(owner, spender);
      assert.equal(preAllowance.toNumber(), amount);
      await this.token.decreaseApproval(spender, amount + 1, { from: owner });

      const allowance = await this.token.allowance(owner, spender);
      assert.equal(allowance.toNumber(), 0);
    });
  });

  describe('.transferFrom()', () => {
    const amount = 100;

    beforeEach(async () => {
      await this.token.approve(spender, amount, { from: owner });
    });

    it(`should transfer ${amount} to 'to' account on behalf of owner`, async () => {
      const beforeOwner = await this.token.balanceOf.call(owner);
      assert.strictEqual(beforeOwner.toNumber(), initialSupply, 'Owner does not have correct start balance');
      const beforeTo = await this.token.balanceOf.call(to);
      assert.strictEqual(beforeTo.toNumber(), 0, 'To does not have correct start balance');

      const { logs } = await this.token.transferFrom(owner, to, amount, { from: spender });
      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'Transfer');
      assert.equal(logs[0].args.from, owner);
      assert.equal(logs[0].args.to, to);
      assert(logs[0].args.value.eq(amount));

      const afterOwner = await this.token.balanceOf.call(owner);
      assert.strictEqual(afterOwner.toNumber(), initialSupply - amount, 'Owner does not have correct end balance');
      const afterTo = await this.token.balanceOf.call(to);
      assert.strictEqual(afterTo.toNumber(), amount, 'To does not have correct end balance');
    });

    it('should fail when trying to transferFrom more than owner balance', async () => {
      const errMsg = 'should not transfer more than owner balance';
      const failingAmount = initialSupply + 1;
      await this.token.approve(spender, failingAmount, { from: owner });

      await expectThrow(
        this.token.transferFrom(owner, to, failingAmount, { from: spender }),
        errMsg,
      );

      const balanceAfter = await this.token.balanceOf.call(owner);
      assert.strictEqual(balanceAfter.toNumber(), initialSupply);
    });

    it('should fail when trying to transferFrom more than approved amount', async () => {
      const errMsg = 'should not transfer more than approved amount';

      const failingAmount = amount + 1;

      await expectThrow(
        this.token.transferFrom(owner, to, failingAmount, { from: spender }),
        errMsg,
      );

      const balanceAfter = await this.token.balanceOf.call(owner);
      assert.strictEqual(balanceAfter.toNumber(), initialSupply);
    });

    it('should fail when trying to transferFrom to address(0)', async () => {
      const errMsg = 'should not transfer to the zero address';

      await expectThrow(
        this.token.transferFrom(owner, ZERO_ADDRESS, amount, { from: spender }),
        errMsg,
      );
      const balanceAfter = await this.token.balanceOf.call(owner);
      assert.strictEqual(balanceAfter.toNumber(), initialSupply);
    });

    it('should fail when trying to transfer to contract address', async () => {
      const errMsg = 'should not transfer to contract address';
      await expectThrow(
        this.token.transferFrom(owner, this.token.address, amount, { from: spender }),
        errMsg,
      );
      const balanceAfter = await this.token.balanceOf.call(owner);
      assert.strictEqual(balanceAfter.toNumber(), initialSupply);
    });
  });

  describe('.forceTransfer()', () => {
    const amount = 100;
    const data = 'Reason for force transfer';

    beforeEach(async () => {
      await this.token.transfer(spender, amount, { from: owner });

      const spenderBalance = await this.token.balanceOf.call(spender);
      assert.strictEqual(spenderBalance.toNumber(), amount, 'to balance not correct in beforeEach');
    });

    it(`should forceTransfer ${amount} to 'to' account on behalf of spender`, async () => {
      const beforeTo = await this.token.balanceOf.call(to);
      assert.strictEqual(beforeTo.toNumber(), 0, 'To does not have correct start balance');

      const { logs } = await this.token.forceTransfer(spender, to, amount, data, { from: owner });
      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'ForceTransfer');
      assert.equal(logs[0].args.from, spender);
      assert.equal(logs[0].args.to, to);
      assert.equal(logs[0].args.owner, owner);
      assert(logs[0].args.value.eq(amount));
      const decodedData = web3.toAscii(logs[0].args.data);
      assert.equal(decodedData, data);

      const afterSpender = await this.token.balanceOf.call(spender);
      assert.strictEqual(afterSpender.toNumber(), 0, 'Spender does not have correct end balance');
      const afterTo = await this.token.balanceOf.call(to);
      assert.strictEqual(afterTo.toNumber(), amount, 'To does not have correct end balance');
    });

    it('should fail when trying to forceTransfer more than owner balance', async () => {
      const errMsg = 'should not transfer more than owner balance';
      const failingAmount = amount + 1;

      await expectThrow(
        this.token.forceTransfer(spender, to, failingAmount, data, { from: owner }),
        errMsg,
      );

      const balanceAfter = await this.token.balanceOf.call(spender);
      assert.strictEqual(balanceAfter.toNumber(), amount);
    });

    it('should fail when trying to transferFrom to address(0)', async () => {
      const errMsg = 'should not transfer to the zero address';

      await expectThrow(
        this.token.forceTransfer(spender, ZERO_ADDRESS, amount, data, { from: owner }),
        errMsg,
      );
      const balanceAfter = await this.token.balanceOf.call(spender);
      assert.strictEqual(balanceAfter.toNumber(), amount);
    });

    it('should fail when trying to transfer to contract address', async () => {
      const errMsg = 'should not transfer to contract address';
      await expectThrow(
        this.token.forceTransfer(spender, this.token.address, amount, data, { from: owner }),
        errMsg,
      );
      const balanceAfter = await this.token.balanceOf.call(spender);
      assert.strictEqual(balanceAfter.toNumber(), amount);
    });

    it('should fail when called by non-owner', async () => {
      const errMsg = 'non-owner should not be able to forceTransfer';
      await expectThrow(
        this.token.forceTransfer(spender, to, amount, data, { from: to }),
        errMsg,
      );
      const balanceAfter = await this.token.balanceOf.call(spender);
      assert.strictEqual(balanceAfter.toNumber(), amount);
    });
  });

  describe('.canSend', () => {
    it('it should return true if there are no modules loaded', async () => {
      const errMsg = 'Should validate transfer when no modules present';
      const isValid = await this.token.canSend.call(
        0x00,
        0x00,
        0,
        { from: owner },
      );
      assert.isTrue(isValid, errMsg);
    });
  });

  describe('.mint()', () => {
    it('should mint initialSupply # of tokens to to account when called by owner', async () => {
      await this.token.mint(to, initialSupply, { from: owner });

      const toBalance = await this.token.balanceOf.call(to);
      assert.strictEqual(toBalance.toNumber(), initialSupply);

      const ownerBalance = await this.token.balanceOf.call(owner);
      assert.strictEqual(ownerBalance.toNumber(), initialSupply);

      const totalSupply = await this.token.totalSupply.call();
      assert.strictEqual(totalSupply.toNumber(), initialSupply * 2);
    });

    it('emits a mint and transfer events', async () => {
      const { logs } = await this.token.mint(to, initialSupply, { from: owner });

      assert.equal(logs.length, 2);

      assert.equal(logs[0].event, 'Mint');
      assert.equal(logs[0].args.to, to);
      assert(logs[0].args.amount.eq(initialSupply));

      assert.equal(logs[1].event, 'Transfer');
      assert.equal(logs[1].args.from, ZERO_ADDRESS);
      assert.equal(logs[1].args.to, to);
      assert(logs[1].args.value.eq(initialSupply));
    });

    it('should fail when trying to mint from non-Owner account', async () => {
      const errMsg = 'should not mint from non-Owner';
      await expectThrow(
        this.token.mint(to, initialSupply, { from: to }),
        errMsg,
      );
      const balanceAfter = await this.token.balanceOf.call(to);
      assert.strictEqual(balanceAfter.toNumber(), 0);
    });

    it('should fail when trying to mint from Owner account if minting is Finished', async () => {
      const errMsg = 'should not mint when minting is finished';
      const { logs } = await this.token.finishMinting({ from: owner });

      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'MintFinished');

      await expectThrow(
        this.token.mint(to, initialSupply, { from: to }),
        errMsg,
      );
      const balanceAfter = await this.token.balanceOf.call(to);
      assert.strictEqual(balanceAfter.toNumber(), 0);
    });
  });

  describe('.burn()', () => {
    it('should burn initialSupply # of tokens from Owner account', async () => {
      await this.token.burn(initialSupply, { from: owner });

      const ownerBalance = await this.token.balanceOf.call(owner);
      assert.strictEqual(ownerBalance.toNumber(), 0);

      const totalSupply = await this.token.totalSupply.call();
      assert.strictEqual(totalSupply.toNumber(), 0);
    });

    it('emits a burn and transfer events', async () => {
      const { logs } = await this.token.burn(initialSupply, { from: owner });

      assert.equal(logs.length, 2);

      assert.equal(logs[0].event, 'Burn');
      assert.equal(logs[0].args.burner, owner);
      assert(logs[0].args.value.eq(initialSupply));

      assert.equal(logs[1].event, 'Transfer');
      assert.equal(logs[1].args.from, owner);
      assert.equal(logs[1].args.to, ZERO_ADDRESS);
      assert(logs[1].args.value.eq(initialSupply));
    });

    it('should fail when trying to burn from non-Owner account', async () => {
      const errMsg = 'should not burn from non-Owner';
      await this.token.transfer(to, initialSupply, { from: owner });

      await expectThrow(
        this.token.burn(initialSupply, { from: to }),
        errMsg,
      );
      const balanceAfter = await this.token.balanceOf.call(to);
      assert.strictEqual(balanceAfter.toNumber(), initialSupply);
    });
  });

  describe('.burnFrom()', () => {
    beforeEach(async () => {
      await this.token.transfer(to, initialSupply, { from: owner });

      const toBalance = await this.token.balanceOf.call(to);
      assert.strictEqual(toBalance.toNumber(), initialSupply, 'to balance not correct in beforeEach');
    });

    it('should burn initialSupply # of tokens from Owner account', async () => {
      await this.token.burnFrom(to, initialSupply, { from: owner });

      const totalSupply = await this.token.totalSupply.call();
      assert.strictEqual(totalSupply.toNumber(), 0);
    });

    it('emits a burn and transfer events', async () => {
      const { logs } = await this.token.burnFrom(to, initialSupply, { from: owner });

      assert.equal(logs.length, 2);

      assert.equal(logs[0].event, 'Burn');
      assert.equal(logs[0].args.burner, to);
      assert(logs[0].args.value.eq(initialSupply));

      assert.equal(logs[1].event, 'Transfer');
      assert.equal(logs[1].args.from, to);
      assert.equal(logs[1].args.to, ZERO_ADDRESS);
      assert(logs[1].args.value.eq(initialSupply));
    });

    it('should fail when called from a non-Owner account', async () => {
      const errMsg = 'should not burnFrom for non-Owner';
      await expectThrow(
        this.token.burnFrom(to, initialSupply, { from: to }),
        errMsg,
      );
      const balanceAfter = await this.token.balanceOf.call(to);
      assert.strictEqual(balanceAfter.toNumber(), initialSupply);
    });
  });
});
