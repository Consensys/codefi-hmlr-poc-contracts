pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../interfaces/IModuleContract.sol";
import "../inheritables/TransferValidator.sol";
import "../interfaces/IERC20.sol";

/**
 * @title Transfer Validator that checks if the trade will increase the to address above a max number of tokens
 */

contract MaxAmountValidator is TransferValidator, IModuleContract, Pausable {
    using SafeMath for uint256;

    /*----------- Constants -----------*/
    bytes32 public constant moduleName = "MaxAmountValidator";

    /*----------- Globals -----------*/
    uint internal maxAmount_;

    /*----------- Events -----------*/
    event LogChangeMaxAmount(address sender, uint maxAmount);

    /**
    * @dev Constructor for contract
    * @param _maxAmount maximum number of tokens an address can own
    */
    constructor(
        uint _maxAmount
    ) public {
        maxAmount_ = _maxAmount;
    }

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
        IERC20 token = IERC20(_token);
        uint toBalance = token.balanceOf(_to);
        uint newTotal = toBalance.add(_amount);
        return (maxAmount_ >= newTotal);
    }


    /*----------- Setter Methods -----------*/
    function setMaxAmount(uint _maxAmount)
        external
        onlyOwner
        whenNotPaused
        returns (bool success)
    {
        maxAmount_ = _maxAmount;
        emit LogChangeMaxAmount(msg.sender, maxAmount_);
        return true;
    }
    
    /*----------- Getter Methods -----------*/
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

    /**
    * @dev Returns the maxAmount of the validator
    * @return uint
    */
    function maxAmount()
        external
        view
        returns(uint)
    {
        return maxAmount_;
    }
}
