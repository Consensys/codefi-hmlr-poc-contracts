/* eslint max-len:0 */
const expectThrow = require('../utils').expectThrow;

const OwnableAbstraction = artifacts.require('Ownable');
let Ownable;

contract('Ownable', (accounts) => {
  beforeEach(async () => {
    Ownable = await OwnableAbstraction.new({ from: accounts[0] });
  });

  it('creation: should have an owner', async () => {
    const owner = await Ownable.owner.call();
    assert.strictEqual(owner, accounts[0]);
  });

  it('transferOwnership: should be able to change ownership if owner', async () => {
    await Ownable.transferOwnership(accounts[1], { from: accounts[0] });
    const owner = await Ownable.owner.call();
    assert.strictEqual(owner, accounts[1]);
  });

  it('transferOwnership: shouldn\'t be able to change ownership if not the owner', async () => {
    expectThrow(Ownable.transferOwnership(accounts[1], { from: accounts[1] }));
    const owner = await Ownable.owner.call();
    assert.strictEqual(owner, accounts[0]);
  });
});
