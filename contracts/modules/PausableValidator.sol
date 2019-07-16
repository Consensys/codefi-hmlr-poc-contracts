pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "../interfaces/IModuleContract.sol";
import "../inheritables/TransferValidator.sol";

/**
 * @title Transfer Validator that pauses transfers and unpauses transfers
 */

contract PausableValidator is TransferValidator, IModuleContract, Pausable {

    /*----------- Constants -----------*/
    bytes32 public constant moduleName = "PausableValidator";

    /*----------- Methods -----------*/
    /**
    * @dev Validate whether contract is paused
    * @param _token address Unused for this validation
    * @param _to address Unused for this validation
    * @param _from address Unused for this validation
    * @param _amount uint256 Unused for this validation
    * @return bool
    */
    function canSend(address _token, address _from, address _to, uint256 _amount)
        external
        returns(bool)
    {
        return !paused;
    }

    /**
    * @dev Returns the name of the validator
    * @return bytes32
    */
    function getName()
        external
        view
        returns(bytes32)
    {
        return moduleName;
    }

    /**
    * @dev Returns the type of the validator
    * @return uint8
    */
    function getType()
        external
        view
        returns(uint8)
    {
        return moduleType;
    }
}
