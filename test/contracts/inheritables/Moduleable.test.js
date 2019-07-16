/* eslint max-len:0 */
const expectThrow = require('../../utils.js').expectThrow;

const ModuleableAbstraction = artifacts.require('Moduleable');
const PausableValidatorAbstraction = artifacts.require('PausableValidator');
const SimpleTokenAbstraction = artifacts.require('SimpleToken');
const OverflowModuleAbstraction = artifacts.require('OverflowModuleMock');

contract('Moduleable', (accounts) => {
  const owner = accounts[0];
  const nonOwner = accounts[1];
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const TRANSFER_VALIDATOR_TYPE = 1;
  let M;
  let PV;

  beforeEach(async () => {
    M = await ModuleableAbstraction.new({ from: owner });
    PV = await PausableValidatorAbstraction.new(
      { from: owner },
    );
  });

  describe('.addModule()', () => {
    it('it should add a module for the owner', async () => {
      const result = await M.addModule(
        PV.address,
        { from: owner },
      );

      assert.strictEqual(
        result.logs[0].event,
        'LogModuleAdded',
      );
      assert.strictEqual(
        result.logs[0].args.moduleAddress,
        PV.address,
      );

      assert.strictEqual(
        result.logs[1].event,
        'LogModuleIndexUpdate',
      );
      assert.strictEqual(
        result.logs[1].args.moduleAddress,
        PV.address,
      );
      assert.strictEqual(
        result.logs[1].args.moduleIndex.toNumber(),
        0,
      );

      const searchResult = await M.getModuleByTypeAndIndex.call(
        TRANSFER_VALIDATOR_TYPE, 0,
      );

      assert.strictEqual(
        PV.address,
        searchResult,
      );
    });
    it('it should reject a module for a non-owner', async () => {
      await expectThrow(M.addModule(
        PV.address,
        { from: nonOwner },
      ));

      const searchResult = await M.getModuleByTypeAndIndex.call(
        TRANSFER_VALIDATOR_TYPE, 0,
      );

      assert.strictEqual(
        ZERO_ADDRESS,
        searchResult,
      );
    });
    it('it should reject a module address of ZERO_ADDRESS', async () => {
      await expectThrow(M.addModule(
        ZERO_ADDRESS,
        { from: owner },
      ));

      const searchResult = await M.getModuleByTypeAndIndex.call(
        TRANSFER_VALIDATOR_TYPE, 0,
      );

      assert.strictEqual(
        ZERO_ADDRESS,
        searchResult,
      );
    });
    it('it should reject a module address of moduleable contract', async () => {
      await expectThrow(M.addModule(
        M.address,
        { from: owner },
      ));

      const searchResult = await M.getModuleByTypeAndIndex.call(
        TRANSFER_VALIDATOR_TYPE, 0,
      );

      assert.strictEqual(
        ZERO_ADDRESS,
        searchResult,
      );
    });
    it('it should reject a module address of non-module contract', async () => {
      const ST = await SimpleTokenAbstraction.new({ from: owner });
      await expectThrow(M.addModule(
        ST.address,
        { from: owner },
      ));

      const searchResult = await M.getModuleByTypeAndIndex.call(
        TRANSFER_VALIDATOR_TYPE, 0,
      );

      assert.strictEqual(
        ZERO_ADDRESS,
        searchResult,
      );
    });
    it('it saves overflowed ModuleType without overwriting existing modules', async () => {
      /**
       * if an attacker is able to add a module that does not enforce it's
       * moduleType as unit8 it could overwrite existing modules
       * uint 257 => uint8 1
       */
      const AM = await OverflowModuleAbstraction.new({ from: owner });

      await M.addModule(
        PV.address,
        { from: owner },
      );

      await M.addModule(
        AM.address,
        { from: owner },
      );

      const validResult = await M.getModuleByTypeAndIndex.call(
        TRANSFER_VALIDATOR_TYPE, 0,
      );

      assert.strictEqual(
        PV.address,
        validResult,
      );

      const searchResult = await M.getModuleByTypeAndIndex.call(
        TRANSFER_VALIDATOR_TYPE, 1,
      );

      assert.strictEqual(
        AM.address,
        searchResult,
      );
    });
  });

  describe('.removeModule()', () => {
    beforeEach(async () => {
      await M.addModule(
        PV.address,
        { from: owner },
      );
    });
    it('it should remove a module for the owner', async () => {
      let searchResult = await M.getModuleByTypeAndIndex.call(
        TRANSFER_VALIDATOR_TYPE, 0,
      );

      assert.strictEqual(
        PV.address,
        searchResult,
      );

      const result = await M.removeModule(
        TRANSFER_VALIDATOR_TYPE,
        0,
        { from: owner },
      );

      assert.strictEqual(
        result.logs[0].event,
        'LogModuleRemoved',
      );

      assert.strictEqual(
        web3._extend.utils.toDecimal(result.logs[0].args.moduleType),
        TRANSFER_VALIDATOR_TYPE,
      );

      assert.strictEqual(
        result.logs[0].args.moduleAddress,
        PV.address,
      );

      searchResult = await M.getModuleByTypeAndIndex.call(
        TRANSFER_VALIDATOR_TYPE, 0,
      );

      assert.strictEqual(
        searchResult,
        ZERO_ADDRESS,
      );
    });
    it('it should reject removing a module for a non-owner', async () => {
      const confirmAdded = await M.getModuleByTypeAndIndex.call(
        TRANSFER_VALIDATOR_TYPE, 0,
      );

      assert.strictEqual(
        PV.address,
        confirmAdded,
      );

      await expectThrow(
        M.removeModule(
          TRANSFER_VALIDATOR_TYPE,
          0,
          { from: nonOwner },
        ),
      );

      const searchResult = await M.getModuleByTypeAndIndex.call(
        TRANSFER_VALIDATOR_TYPE, 0,
      );

      assert.strictEqual(
        PV.address,
        searchResult,
      );
    });
    it('it should reject removing module when given wrong index', async () => {
      const confirmAdded = await M.getModuleByTypeAndIndex.call(
        TRANSFER_VALIDATOR_TYPE, 0,
      );

      assert.strictEqual(
        PV.address,
        confirmAdded,
      );

      await expectThrow(
        M.removeModule(
          TRANSFER_VALIDATOR_TYPE,
          1,
          { from: owner },
        ),
      );

      const searchResult = await M.getModuleByTypeAndIndex.call(
        TRANSFER_VALIDATOR_TYPE, 0,
      );

      assert.strictEqual(
        PV.address,
        searchResult,
      );
    });
    it('it should protect against uint8 underflow in moduleIndex', async () => {
      await M.removeModule(
        TRANSFER_VALIDATOR_TYPE,
        0,
        { from: owner },
      );
      const confirmRemoved = await M.getModuleByTypeAndIndex.call(
        TRANSFER_VALIDATOR_TYPE, 0,
      );

      assert.strictEqual(
        ZERO_ADDRESS,
        confirmRemoved,
      );

      // if we remove again, and it should stop before altering the array length
      await expectThrow(
        M.removeModule(
          TRANSFER_VALIDATOR_TYPE,
          0,
          { from: owner },
        ),
      );

      const searchResult = await M.getModuleByTypeAndIndex.call(
        TRANSFER_VALIDATOR_TYPE, 0,
      );

      assert.strictEqual(
        ZERO_ADDRESS,
        searchResult,
      );
    });
    it('it will remove the first module if given overflowed uint8', async () => {
      let searchResult = await M.getModuleByTypeAndIndex.call(
        TRANSFER_VALIDATOR_TYPE, 0,
      );

      assert.strictEqual(
        searchResult,
        PV.address,
      );

      const result = await M.removeModule(
        TRANSFER_VALIDATOR_TYPE,
        256,
        { from: owner },
      );

      assert.strictEqual(
        result.logs[0].event,
        'LogModuleRemoved',
      );

      assert.strictEqual(
        web3._extend.utils.toDecimal(result.logs[0].args.moduleType),
        TRANSFER_VALIDATOR_TYPE,
      );

      assert.strictEqual(
        result.logs[0].args.moduleAddress,
        PV.address,
      );

      searchResult = await M.getModuleByTypeAndIndex.call(
        TRANSFER_VALIDATOR_TYPE, 0,
      );

      assert.strictEqual(
        searchResult,
        ZERO_ADDRESS,
      );
    });
    it('it will remove modules from first Type with overflowed uint8 moduleType', async () => {
      let searchResult = await M.getModuleByTypeAndIndex.call(
        TRANSFER_VALIDATOR_TYPE, 0,
      );

      assert.strictEqual(
        searchResult,
        PV.address,
      );

      const result = await M.removeModule(
        257, // == uint8 1
        0,
        { from: owner },
      );

      assert.strictEqual(
        result.logs[0].event,
        'LogModuleRemoved',
      );

      assert.strictEqual(
        web3._extend.utils.toDecimal(result.logs[0].args.moduleType),
        TRANSFER_VALIDATOR_TYPE,
      );

      assert.strictEqual(
        result.logs[0].args.moduleAddress,
        PV.address,
      );

      searchResult = await M.getModuleByTypeAndIndex.call(
        TRANSFER_VALIDATOR_TYPE, 0,
      );

      assert.strictEqual(
        searchResult,
        ZERO_ADDRESS,
      );
    });
    describe('multiple modules added and removed correctly', async () => {
      let PV2;
      let PV3;

      beforeEach(async () => {
        PV2 = await PausableValidatorAbstraction.new(
          { from: owner },
        );
        await M.addModule(
          PV2.address,
          { from: owner },
        );

        PV3 = await PausableValidatorAbstraction.new(
          { from: owner },
        );
        await M.addModule(
          PV3.address,
          { from: owner },
        );
      });

      it('maintains structure correctly on removal', async () => {
        const MODULE_TYPE = 1;
        // 3 modules have been added

        // The middle modules is removed
        const result = await M.removeModule(MODULE_TYPE, 1);

        // There should be modules at indices [0,1] and 0x at [2]
        const index0 = await M.getModuleByTypeAndIndex.call(
          TRANSFER_VALIDATOR_TYPE, 0,
        );
        const index1 = await M.getModuleByTypeAndIndex.call(
          TRANSFER_VALIDATOR_TYPE, 1,
        );
        const index2 = await M.getModuleByTypeAndIndex.call(
          TRANSFER_VALIDATOR_TYPE, 2,
        );

        // First 2 indices include the modules that weren't removed
        assert.include(
          [PV.address, PV3.address],
          index0,
        );
        assert.include(
          [PV.address, PV3.address],
          index1,
        );

        // The removed module (PV2) is not present
        assert.notInclude(
          [index0, index1, index2],
          PV2.address,
        );

        // Index2 is out of range so returns 0x
        assert.strictEqual(
          ZERO_ADDRESS,
          index2,
        );

        // it should emit an event for the changed module Index
        assert.strictEqual(
          result.logs[1].event,
          'LogModuleIndexUpdate',
        );
        assert.strictEqual(
          result.logs[1].args.moduleAddress,
          PV3.address,
        );
        assert.strictEqual(
          result.logs[1].args.moduleIndex.toNumber(),
          1,
        );
      });

      it('Emits LogModuleIndexUpdate when first module removed', async () => {
        const MODULE_TYPE = 1;
        // 3 modules have been added

        // The middle modules is removed
        const result = await M.removeModule(MODULE_TYPE, 0);

        // it should emit an event for the changed module Index
        assert.strictEqual(
          result.logs[1].event,
          'LogModuleIndexUpdate',
        );
        assert.strictEqual(
          result.logs[1].args.moduleAddress,
          PV3.address,
        );
        assert.strictEqual(
          result.logs[1].args.moduleIndex.toNumber(),
          0,
        );
      });

      it('Emits LogModuleIndexUpdate when middle module removed', async () => {
        const MODULE_TYPE = 1;
        // 3 modules have been added

        // The middle modules is removed
        const result = await M.removeModule(MODULE_TYPE, 1);

        // it should emit an event for the changed module Index
        assert.strictEqual(
          result.logs[1].event,
          'LogModuleIndexUpdate',
        );
        assert.strictEqual(
          result.logs[1].args.moduleAddress,
          PV3.address,
        );
        assert.strictEqual(
          result.logs[1].args.moduleIndex.toNumber(),
          1,
        );
      });

      it('Does not emit LogModuleIndexUpdate when last module removed', async () => {
        const MODULE_TYPE = 1;
        // 3 modules have been added

        // The middle modules is removed
        const result = await M.removeModule(MODULE_TYPE, 2);

        // it should emit an event for the changed module Index
        assert.isUndefined(
          result.logs[1],
          'No second event should have been emitted',
        );
        assert.notEqual(
          result.logs[0].event,
          'LogModuleIndexUpdate',
          'First event should not be the IndexUpdate',
        );
      });

      it('Successfully removes last Module after it has been shifted', async () => {
        const MODULE_TYPE = 1;
        // 3 modules have been added

        // The middle modules is removed
        const result = await M.removeModule(MODULE_TYPE, 1);

        // There should be modules at indices [0,1] and 0x at [2]
        const index0 = await M.getModuleByTypeAndIndex.call(
          TRANSFER_VALIDATOR_TYPE, 0,
        );
        const index1 = await M.getModuleByTypeAndIndex.call(
          TRANSFER_VALIDATOR_TYPE, 1,
        );
        const index2 = await M.getModuleByTypeAndIndex.call(
          TRANSFER_VALIDATOR_TYPE, 2,
        );

        // First 2 indices include the modules that weren't removed
        assert.include(
          [PV.address, PV3.address],
          index0,
        );
        assert.include(
          [PV.address, PV3.address],
          index1,
        );

        // The removed module (PV2) is not present
        assert.notInclude(
          [index0, index1, index2],
          PV2.address,
        );

        // Index2 is out of range so returns 0x
        assert.strictEqual(
          ZERO_ADDRESS,
          index2,
        );

        // it should emit an event for the changed module Index
        assert.strictEqual(
          result.logs[1].event,
          'LogModuleIndexUpdate',
        );
        assert.strictEqual(
          result.logs[1].args.moduleAddress,
          PV3.address,
        );
        assert.strictEqual(
          result.logs[1].args.moduleIndex.toNumber(),
          1,
        );

        // remove the module at index 1 again (module that has been shifted positions)
        await M.removeModule(MODULE_TYPE, 1);

        const nowIndex1 = await M.getModuleByTypeAndIndex.call(
          TRANSFER_VALIDATOR_TYPE, 1,
        );

        assert.strictEqual(
          ZERO_ADDRESS,
          nowIndex1,
        );
      });

      it('handles all modules removed correctly', async () => {
        const MODULE_TYPE = 1;
        // 3 modules have been added

        // The modules are removed
        await M.removeModule(MODULE_TYPE, 0);
        await M.removeModule(MODULE_TYPE, 0);
        await M.removeModule(MODULE_TYPE, 0);

        // All indices should return 0x
        const index0 = await M.getModuleByTypeAndIndex.call(
          TRANSFER_VALIDATOR_TYPE, 0,
        );
        const index1 = await M.getModuleByTypeAndIndex.call(
          TRANSFER_VALIDATOR_TYPE, 1,
        );
        const index2 = await M.getModuleByTypeAndIndex.call(
          TRANSFER_VALIDATOR_TYPE, 2,
        );

        assert.strictEqual(
          ZERO_ADDRESS,
          index0,
        );
        assert.strictEqual(
          ZERO_ADDRESS,
          index1,
        );
        assert.strictEqual(
          ZERO_ADDRESS,
          index2,
        );
      });

      it('handles all modules removed and then modules added', async () => {
        const MODULE_TYPE = 1;
        // 3 modules have been added

        // The modules are removed
        await M.removeModule(MODULE_TYPE, 0);
        await M.removeModule(MODULE_TYPE, 0);
        await M.removeModule(MODULE_TYPE, 0);

        // Add a new modules
        await M.addModule(
          PV.address,
          { from: owner },
        );

        // All indices but the first should return 0x
        const index0 = await M.getModuleByTypeAndIndex.call(
          TRANSFER_VALIDATOR_TYPE, 0,
        );
        const index1 = await M.getModuleByTypeAndIndex.call(
          TRANSFER_VALIDATOR_TYPE, 1,
        );
        const index2 = await M.getModuleByTypeAndIndex.call(
          TRANSFER_VALIDATOR_TYPE, 2,
        );

        assert.strictEqual(
          PV.address,
          index0,
        );
        assert.strictEqual(
          ZERO_ADDRESS,
          index1,
        );
        assert.strictEqual(
          ZERO_ADDRESS,
          index2,
        );
      });
    });
  });


  describe('.getModuleByTypeAndIndex', () => {
    it('can getModuleByTypeAndIndex from the added modules', async () => {
      const PV1 = await PausableValidatorAbstraction.new(
        { from: owner },
      );
      await M.addModule(PV1.address);

      const PV2 = await PausableValidatorAbstraction.new(
        { from: owner },
      );
      await M.addModule(PV2.address);

      const PV3 = await PausableValidatorAbstraction.new(
        { from: owner },
      );
      await M.addModule(PV3.address);

      const result1 = await M.getModuleByTypeAndIndex.call(
        TRANSFER_VALIDATOR_TYPE, 0,
      );
      const result2 = await M.getModuleByTypeAndIndex.call(
        TRANSFER_VALIDATOR_TYPE, 1,
      );
      const result3 = await M.getModuleByTypeAndIndex.call(
        TRANSFER_VALIDATOR_TYPE, 2,
      );

      assert.strictEqual(
        PV1.address,
        result1,
      );
      assert.strictEqual(
        PV2.address,
        result2,
      );
      assert.strictEqual(
        PV3.address,
        result3,
      );
    });
  });
});
