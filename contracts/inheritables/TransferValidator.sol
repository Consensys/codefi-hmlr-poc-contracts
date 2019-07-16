pragma solidity 0.4.24;

import "../interfaces/ITransferValidator.sol";

/**
 * @title Base for Transfer Validators, sets moduleType and inherits Interface
 */

contract TransferValidator is ITransferValidator {
    uint8 constant moduleType = 1;
}
