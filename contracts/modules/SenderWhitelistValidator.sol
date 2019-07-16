pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "../interfaces/IModuleContract.sol";
import "../inheritables/TransferValidator.sol";

/**
 * @title Transfer Validator that checks if sender/maker is on the whitelist
 */

contract SenderWhitelistValidator is TransferValidator, IModuleContract, Pausable { 

    /*----------- Constants -----------*/
    bytes32 public constant moduleName = "SenderWhitelistValidator";

    /*----------- Globals -----------*/
    mapping(address => bool) public whitelist;

    /*----------- Events -----------*/
    event LogAddAddress(address sender, address nowOkay);
    event LogRemoveAddress(address sender, address deleted);

    /*----------- Validator Methods -----------*/
    /**
    * @dev Validate whether a sender address is added to the whitelist
    * @param _token address Unused for this validation
    * @param _to address unused for this validation
    * @param _from address The address which you want to transfer from
    * @param _amount uint256 unused for this validation
    * @return bool
    */
    function canSend(address _token, address _from, address _to, uint256 _amount)
        external
        returns(bool)
    {
        return isWhitelisted(_from);
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

    /*----------- Owner Methods -----------*/
    /**
    * @dev Add address to whitelist
    * @param _okay address Unused for this validation
    * @return success bool
    */
    function addAddress(address _okay)
        external
        onlyOwner
        whenNotPaused
        returns (bool success)
    {
        require(_okay != address(0));
        require(!isWhitelisted(_okay));
        whitelist[_okay] = true;
        emit LogAddAddress(msg.sender, _okay);
        return true;
    }

    /**
    * @dev Remove address from whitelist
    * @param _delete address Unused for this validation
    * @return success bool
    */
    function removeAddress(address _delete)
        external
        onlyOwner
        whenNotPaused
        returns(bool success)
    {
        require(isWhitelisted(_delete));
        whitelist[_delete] = false;
        emit LogRemoveAddress(msg.sender, _delete);
        return true;
    }

    /*----------- View Methods -----------*/
    function isWhitelisted(address _check)
        public
        view
        returns(bool isIndeed)
    {
        return whitelist[_check];
    }
}
