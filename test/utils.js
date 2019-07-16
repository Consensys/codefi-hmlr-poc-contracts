const isReverted = err => err.toString().includes('revert');

const isEVMException = err => isReverted(err) || err.toString().includes('VM Exception');

const isNotAFunction = err => err.toString().includes('not a function');

const didNotSaveContract = err => err.toString().includes('contract code couldn\'t be stored');

const invalidJump = err => err.toString().includes('invalid JUMP');

const invalidOpcode = err => err.toString().includes('invalid opcode');

const outOfGas = err => err.toString().includes('out of gas');

const logEvents = (subject, receipt) => {
  console.log(`Events for ${subject}:`);
  receipt.logs.forEach((log, index) => {
    console.log(`${index} ${log.event}:`);
    Object.keys(log.args).map((argKey) => {
      console.log(`    ${argKey}: ${log.args[argKey]}`);
      return argKey;
    });
    console.log('');
  });
};

const expectThrow = async (promise, errMsg = 'Expected throw not received') => {
  let result;
  try {
    result = await promise;
  } catch (error) {
    assert.isTrue(
      isReverted(error)
      || isEVMException(error)
      || isNotAFunction(error)
      || didNotSaveContract(error)
      || invalidJump(error)
      || invalidOpcode(error)
      || outOfGas(error),
      `Expected throw, got '${error}' instead`,
    );
    return;
  }
  assert.isTrue(false, `${errMsg} ${result.toString()}`);
};

module.exports = {
  isReverted,
  isEVMException,
  isNotAFunction,
  didNotSaveContract,
  expectThrow,
  logEvents,
};
