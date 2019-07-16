pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../interfaces/IModuleContract.sol";
import "../inheritables/TransferValidator.sol";
import "../interfaces/IERC20.sol";

/**
 * @title Transfer Validator that checks if the trade will increase the investorCount above a max number of investors
 */

contract InvestorCapValidator is TransferValidator, IModuleContract, Pausable {
    using SafeMath for uint;

    /*----------- Constants -----------*/
    bytes32 public constant moduleName = "InvestorCapValidator";

    /*----------- Globals -----------*/
    mapping(address => uint) internal investorCounts_;
    uint internal investorCap_;

    /*----------- Events -----------*/
    event LogInvestorCountOverride(
        address indexed sender,
        address indexed investment,
        uint newInvestorCount
    );
    event LogSetInvestorCap(
        address indexed sender,
        uint newInvestorCap
    );

    /**
    * @dev Constructor for contract
    * @param _investorCap maximum number of investors a token can have
    */
    constructor(
        uint _investorCap
    ) public {
        investorCap_ = _investorCap;
    }

    /*----------- Validator Methods -----------*/
    /**
    * @dev Validate whether a trade will change the number of investors to a number above the Cap
    * @param _token address token we are checking
    * @param _to address The address which you want to transfer to
    * @param _from address The Address which you want to transfer from
    * @param _amount uint256 The Amount of tokens being transferred
    * @return bool
    */
    function canSend(address _token, address _from, address _to, uint256 _amount)
        external
        returns(bool)
    {
        IERC20 token = IERC20(_token);
        uint toBalance = token.balanceOf(_to);
        uint fromBalance = token.balanceOf(_from);

        return validateAndUpdateCount(toBalance, fromBalance, _amount, msg.sender);
    }

    /*----------- Internal Methods -----------*/
    /**
    * @dev Validates and updates the balances
    * @param toBalance balance of to address
    * @param fromBalance balance of from address
    * @param amount amount to be traded
    * @return bool
    */
    function validateAndUpdateCount(
        uint toBalance,
        uint fromBalance,
        uint amount,
        address investment
    ) 
        internal
        returns (bool)
    {
        bool toIsNew = (toBalance == 0);
        bool fromIsLeaving = (fromBalance.sub(amount) == 0);

        if (toIsNew && !fromIsLeaving) {
            if (investorCounts_[investment].add(1) > investorCap_) {
                return false;
            }
            investorCounts_[investment] = investorCounts_[investment].add(1);
            return true; 
        }

        if (!toIsNew && fromIsLeaving) {
            investorCounts_[investment] = investorCounts_[investment].sub(1);
            return true;
        }

        return true;
    }


    /*----------- Setter Methods -----------*/
    /**
    * @dev Sets InvestorCount, 
    *      Allowing the owner to "catch up" on trades that occured before module
    *      was added
    * @param investment address of investment for which investors are being tracked
    * @param _investorCount current number of investors
    * @return uint newInvestorCount
    */
    function overrideInvestorCount(
        address investment,
        uint _investorCount
    )
        external
        onlyOwner
        whenNotPaused
        returns (uint newInvestorCount)
    {
        investorCounts_[investment] = _investorCount;
        emit LogInvestorCountOverride(msg.sender, investment, investorCounts_[investment]);
        return investorCounts_[investment];
    }

    /**
    * @dev Sets InvestorCap, 
    * @param _investorCap maximum number of investors
    * @return uint newInvestorCap
    */
    function setInvestorCap(
        uint _investorCap
    )
        external
        onlyOwner
        whenNotPaused
        returns (uint newInvestorCap)
    {
        investorCap_ = _investorCap;
        emit LogSetInvestorCap(msg.sender, investorCap_);
        return investorCap_;
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
    * @dev Returns the investorCap of the validator
    * @return uint
    */
    function investorCap()
        external
        view
        returns(uint)
    {
        return investorCap_;
    }

    /**
    * @dev Returns the investorCount of the validator
    * @param investment address of investment for which to return the investorCount
    * @return uint
    */
    function investorCount(address investment)
        external
        view
        returns(uint)
    {
        return investorCounts_[investment];
    }

    /**
    * @dev Returns the investorCap - investorCount of the validator
    * @param investment address of investment for which to return the remaining investors
    * @return uint
    */
    function getRemainingInvestors(address investment)
        external
        view
        returns(uint)
    {
        return (investorCap_ - investorCounts_[investment]);
    }
}
