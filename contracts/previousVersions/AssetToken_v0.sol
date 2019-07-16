pragma solidity 0.4.24;

import {Whitelist_v0 as Whitelist} from "./Whitelist_v0.sol";
import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "openzeppelin-solidity/contracts/lifecycle/TokenDestructible.sol";

contract AssetTokenv0 is StandardToken, Pausable, TokenDestructible {
  /*----------- Globals -----------*/

    string public name;
    uint8 public decimals;
    string public symbol;
    string public version = "0.2";
    Whitelist public whitelist;
    uint public investorCap;
    uint public currentInvestors;

    /*----------- Events -----------*/
    event LogChangeWhitelist(address sender, address whitelistAddress);

    /*----------- Modifier -----------*/
    modifier onlyWhitelist(address recipient) {
        require(whitelist.isWhitelisted(recipient));
        _;
    }

    modifier allowedByInvestorCap(address _to) {
        if (balanceOf(_to)== 0) {
            require(currentInvestors < investorCap);
        }
        _;
    }

    modifier noZeroTransfer(uint amt) {
        require(amt > 0, "Must transfer more than 0 tokens");
        _;
    }

  /*----------- Constructor -----------*/
    constructor(
        uint256 _initialAmount,
        string _name,
        uint8 _decimalUnits,
        string _symbol,
        address _whitelist,
        uint _investorCap
    ) 
        public
    {
        require(_investorCap > 0, "investorCap cannot start as 0");
        name = _name;
        symbol = _symbol;
        decimals = _decimalUnits;
        investorCap = _investorCap;
        whitelist = Whitelist(_whitelist);
        currentInvestors = 1;
        _mint(msg.sender, _initialAmount);
    }

    /**
    * @dev Internal function that mints an amount of the token and assigns it to
    * an account. This encapsulates the modification of balances such that the
    * proper events are emitted.
    * @param _account The account that will receive the created tokens.
    * @param _amount The amount that will be created.
    */
    function _mint(address _account, uint256 _amount) internal {
        totalSupply_ = totalSupply_.add(_amount);
        balances[_account] = balances[_account].add(_amount);
        emit Transfer(address(0), _account, _amount);
    }

    /*----------- Owner Methods -----------*/
    /**
    * @dev Change the address of the whitelist contract
    * @param _whitelist address The new address used to find the whitelist
    */
    function changeWhitelist(address _whitelist)
        public
        onlyOwner
        returns (bool success)
    {
        require(_whitelist != address(0));

        whitelist = Whitelist(_whitelist);
        return true;
    }

    /**
    * @dev Change the maximum allowable investors
    * @param _investorCap new maximum investor count
    */
    function changeInvestorCapTo(uint _investorCap)
        public
        onlyOwner
        returns (bool success)
    {
        require(_investorCap >= currentInvestors);
        investorCap = _investorCap;
        return true;
    }

    /**
    * @dev Change the name
    * @param _name new string for the name 
    */
    function changeName(string _name) 
        public
        onlyOwner
        returns( bool success )
    {
        name = _name;
        return true;
    }

    /**
      * @dev Change the decimalUnits
      * @param _decimalUnits new uint8 for controlling the decimal units
      */
    function changeDecimalUnits(uint8 _decimalUnits) 
        public
        onlyOwner
        returns( bool success )
    {
        decimals = _decimalUnits;
        return true;
    }

    /**
      * @dev Change the token symbol
      * @param _symbol new string for the symbol 
      */
    function changeSymbol(string _symbol) 
        public
        onlyOwner
        returns( bool success )
    {
        symbol = _symbol;
        return true;
    }

    /*----------- Whitelisted Methods -----------*/
    /**
    * @dev Transfer tokens from sender's address to another
    * @param _to address The address which you want to transfer to
    * @param _value uint256 the amount of tokens to be transferred
    */
    function transfer(address _to, uint256 _value) 
        public 
        noZeroTransfer(_value)
        whenNotPaused()
        onlyWhitelist(_to)
        allowedByInvestorCap(_to)
        returns (bool success) 
    {
        bool toBalanceZero = balanceOf(_to) == 0;

        super.transfer(_to, _value);

        updateInvestorCount(toBalanceZero, msg.sender);
        
        return true;
    }

    /**
    * @dev Transfer tokens from one address to another
    * @param _from address The address which you want to send tokens from
    * @param _to address The address which you want to transfer to
    * @param _value uint256 the amount of tokens to be transferred
    */
    function transferFrom(address _from, address _to, uint256 _value) 
        public 
        noZeroTransfer(_value)
        whenNotPaused()
        onlyWhitelist(_to)
        allowedByInvestorCap(_to)
        returns (bool success) 
    {
        bool toBalanceZero = balanceOf(_to) == 0;
        
        super.transferFrom(_from, _to, _value);

        updateInvestorCount(toBalanceZero, _from);

        return true;
    }
  
    /*----------- Constant Methods -----------*/
    function getWhitelist()
        public
        view
        returns(address whitelistAddress)
    {
        return whitelist;
    }

    function getOpenInvestorCount()
        public
        view
        returns(uint unfilled)
    {
        return investorCap - currentInvestors;
    }

    /*----------- Internal Methods -----------*/
    function updateInvestorCount(bool toBalanceZero, address _from) 
        internal 
    {
        if (toBalanceZero) { 
            currentInvestors = currentInvestors.add(1);
        }
        if (balanceOf(_from) == 0) {
            require(currentInvestors.sub(1) >= 1, "Current Investors cannot be set to less than 1");
            currentInvestors = currentInvestors.sub(1);
        }
    }
}