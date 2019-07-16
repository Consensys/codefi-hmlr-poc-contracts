pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "../interfaces/IModuleContract.sol";
import "../inheritables/TransferValidator.sol";

/**
 * @title LockUpPeriodValidator
 * TransferValidator where Owner sets the time when a LockUp period ends. All transfers fail until that time is reached.
 */

contract LockUpPeriodValidator is TransferValidator, IModuleContract, Pausable {

    /*----------- Constants -----------*/
    bytes32 public constant moduleName = "LockUpPeriodValidator";

    /*----------- Globals -----------*/
    uint256 public openingTime_;

    /*----------- Events -----------*/
    event LogSetOpeningTime(address indexed sender, uint newOpeningTime);

    /**
    * @dev Constructor for contract
    * @param _openingTime blocktime at which trading can start
    */
    constructor(
        uint _openingTime
    ) public {
        setOpeningTime_(_openingTime);
    }

    /*----------- Validator Methods -----------*/
    /**
    * @dev Validate whether a trade will occur before the specified openingTime
    * @param _token address token we are checking
    * @param _to address The address which you want to transfer to
    * @param _from address The Address which you want to transfer from
    * @param _amount uint256 The Amount of tokens being transferred
    * @return bool
    */
    function canSend(
        address _token, 
        address _from, 
        address _to, 
        uint256 _amount
    )
        external
        returns(bool)
    {
        return (openingTime_ <= block.timestamp);
    }

    /*----------- Internal Methods -----------*/
    function setOpeningTime_(uint _openingTime) 
        internal
    {
        // solium-disable-next-line security/no-block-members
        require(_openingTime >= block.timestamp);
        openingTime_ = _openingTime;
    }

    /*----------- Setter Methods -----------*/
    /**
    * @dev Sets OpeningTime, 
    * @param _openingTime desired opening time
    * @return uint newOpeningTime
    */
    function setOpeningTime(uint _openingTime)
        external
        onlyOwner
        whenNotPaused
        returns (uint newOpeningTime)
    {
        setOpeningTime_(_openingTime);
        emit LogSetOpeningTime(msg.sender, openingTime_);
        return openingTime_;
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
    * @dev Returns the investorMin of the validator
    * @return uint
    */
    function openingTime()
        external
        view
        returns(uint)
    {
        return openingTime_;
    }

}
