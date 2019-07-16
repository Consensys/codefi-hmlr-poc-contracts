const expectThrow = require('../utils.js').expectThrow;

const SimpleLinkRegistry = artifacts.require('SimpleLinkRegistry');

contract('SimpleLinkRegistry', (accounts) => {
  const owner = accounts[0];
  const otherOwner = accounts[1];
  const tempAddress = accounts[2];
  const key1 = 'key1';
  const link1 = 'https://www.meridio.co/';
  let contract;

  beforeEach(async () => {
    contract = await SimpleLinkRegistry.new({ from: owner });
  });

  it('should set a link and fire an event', async () => {
    contract = await SimpleLinkRegistry.new({ from: owner });
    const { logs } = await contract.setLink(
      tempAddress,
      key1,
      link1,
      { from: owner },
    );

    assert.strictEqual(
      logs[0].event,
      'LinkSet',
    );
    assert.strictEqual(
      tempAddress,
      logs[0].args.subject,
    );
    assert.strictEqual(
      key1,
      web3._extend.utils.toAscii(logs[0].args.key).replace(/\0/g, ''),
    );
    assert.strictEqual(
      link1,
      logs[0].args.value,
    );
  });

  it('should not set a link if it is not called by owner', async () => {
    const errMsg = 'It should throw if not owner';
    await expectThrow(
      contract.setLink(
        tempAddress,
        key1,
        link1,
        { from: otherOwner },
      ),
      errMsg,
    );
  });

  context('when a link as been set', async () => {
    beforeEach(async () => {
      await contract.setLink(
        tempAddress,
        key1,
        link1,
        { from: owner },
      );
    });

    it('should get an existing link correctly', async () => {
      const result = await contract.getLink(
        tempAddress,
        key1,
      );

      assert.strictEqual(
        link1,
        result,
      );
    });

    it('should get an empty link correctly', async () => {
      const result = await contract.getLink(
        tempAddress,
        'key2',
      );

      assert.strictEqual(
        '',
        result,
      );
    });

    it('should get an empty link correctly for wrong subject', async () => {
      const result = await contract.getLink(
        '0x0000000000000000000000000000000000000000',
        key1,
      );

      assert.strictEqual(
        '',
        result,
      );
    });
  });
});
