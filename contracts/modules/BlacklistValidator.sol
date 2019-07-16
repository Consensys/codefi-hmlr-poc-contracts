pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "../interfaces/IModuleContract.sol";
import "../inheritables/TransferValidator.sol";

/**
 * @title Transfer Validator that checks if receiver/taker is NOT on blacklist
 */

contract BlacklistValidator is TransferValidator, IModuleContract, Pausable { 

    /*----------- Constants -----------*/
    bytes32 public constant moduleName = "BlacklistValidator";

    /*----------- Globals -----------*/
    mapping(address => bool) public blacklist;

    /*----------- Events -----------*/
    event LogAddAddress(address sender, address nowOkay);
    event LogRemoveAddress(address sender, address deleted);

    /*----------- Validator Methods -----------*/
    /**
    * @dev Validate whether an address is not on the blacklist
    * @param _token address Unused for this validation
    * @param _to address The address which you want to transfer to
    * @param _from address unused for this validation
    * @param _amount uint256 unused for this validation
    * @return bool
    */
    function canSend(address _token, address _from, address _to, uint256 _amount)
        external
        returns(bool)
    {
        return !isBlacklisted(_to);
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
    * @dev Add address to blacklist
    * @param _okay address Unused for this validation
    * @return success bool
    */
    function addAddress(address _okay)
        external
        onlyOwner
        whenNotPaused
        returns (bool success)
    {
        require(_okay != address(0), "Address to add must not be 0 address");
        require(!isBlacklisted(_okay), "Address must not already be on the blacklist");
        blacklist[_okay] = true;
        emit LogAddAddress(msg.sender, _okay);
        return true;
    }

    /**
    * @dev Remove address from blacklist
    * @param _delete address Unused for this validation
    * @return success bool
    */
    function removeAddress(address _delete)
        external
        onlyOwner
        whenNotPaused
        returns(bool success)
    {
        require(isBlacklisted(_delete), "Address must already be on the blacklist");
        blacklist[_delete] = false;
        emit LogRemoveAddress(msg.sender, _delete);
        return true;
    }

    /*----------- View Methods -----------*/
    function isBlacklisted(address _check)
        public
        view
        returns(bool isIndeed)
    {
        return blacklist[_check];
    }
}
