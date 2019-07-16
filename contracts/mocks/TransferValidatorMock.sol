pragma solidity 0.4.24;

import "../inheritables/TransferValidator.sol";

/**
 * @title Transfer Validator mock
 */

contract TransferValidatorMock is TransferValidator {

  /*----------- Constants -----------*/
    bytes32 public constant moduleName = "TransferValidatorMock";

  /*----------- Methods -----------*/
    function getType()
        external
        pure
        returns(uint8)
    {
        return moduleType;
    }

    function canSend(address _token, address _from, address _to, uint256 _amount)
        public
        view
        returns(bool)
    {
        return true;
    }
}
