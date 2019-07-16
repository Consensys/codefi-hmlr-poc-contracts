pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/BurnableToken.sol";
import "./inheritables/Moduleable.sol";
import "./interfaces/ITransferValidator.sol";

contract AssetToken is MintableToken, BurnableToken, Moduleable {
    
    /*----------- Events -----------*/
    event ForceTransfer(
        address indexed from,
        address indexed to,
        address indexed owner,
        uint256 value,
        bytes data
    );

    /*----------- Globals -----------*/
    bool internal _initialized = false;
    string public name;
    uint8 public decimals;
    string public symbol;
    string public version = "0.3";
    uint8 public constant TRANSFER_VALIDATOR_TYPE = 1;

    /*----------- Modifiers -----------*/
    modifier onlyInitialized() {
        require(_initialized, "onlyInitialized");
        _;
    }
    modifier onlyNotInitialized() {
        require(!_initialized, "onlyNotInitialized");
        _;
    }

    modifier validDestination( address to ) {
        require(to != address(0x0), "Cannot transfer to 0 address");
        require(to != address(this), "Cannot transfer to self");
        _;
    }

    /*----------- initialize -----------*/
    function initialize(
        address _owner,
        uint256 _initialAmount,
        string _name,
        uint8 _decimalUnits,
        string _symbol
    ) 
        external 
        onlyNotInitialized
    {
        require(!_initialized, "Already Initialized");
        owner = _owner;
        name = _name;
        decimals = _decimalUnits;
        symbol = _symbol;
        totalSupply_ = _initialAmount;
        balances[owner] = _initialAmount;
        emit Transfer(address(0), owner, totalSupply_);
        _initialized = true;
    }

    /**
    * @dev Change the name
    * @param _name new string for the name 
    */
    function changeName(string _name) 
        external
        onlyOwner
        onlyInitialized
        returns( bool success )
    {
        name = _name;
        return true;
    }

    /**
      * @dev Change the token symbol
      * @param _symbol new string for the symbol 
      */
    function changeSymbol(string _symbol) 
        external
        onlyOwner
        onlyInitialized
        returns( bool success )
    {
        symbol = _symbol;
        return true;
    }

    /*----------- Transfer Methods -----------*/
    /**
    * @dev Transfer tokens from sender's address to another
    * @param _to address The address which you want to transfer to
    * @param _value uint256 the amount of tokens to be transferred
    */
    function transfer(address _to, uint256 _value) 
        public
        validDestination(_to)
        returns (bool success)
    {
        require(canSend(msg.sender, _to, _value), "Transfer is not valid");
        super.transfer(_to, _value);

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
        validDestination(_to)
        returns (bool success)
    {
        require(canSend(_from, _to, _value), "Transfer is not valid");
        super.transferFrom(_from, _to, _value);

        return true;
    }

    /**
    * @dev Force the Transfer of tokens from one address to another
    * @param _from address The address which you want to send tokens from
    * @param _to address The address which you want to transfer to
    * @param _value uint256 the amount of tokens to be transferred
    */
    function forceTransfer(
        address _from,
        address _to,
        uint256 _value,
        bytes _data
    ) 
        public
        onlyOwner
        validDestination(_to)
        returns (bool success)
    {
        require(_value <= balances[_from], "_from Address does not have sufficient balance");
        require(canSend(_from, _to, _value), "Transfer is not valid");

        balances[_from] = balances[_from].sub(_value);
        balances[_to] = balances[_to].add(_value);

        emit ForceTransfer(_from, _to, msg.sender, _value, _data);

        return true;
    }

    /**
    * @notice validate transfer with TransferValidator module(s) if they exists
    * @param _from sender of transfer
    * @param _to receiver of transfer
    * @param _amount value of transfer
    * @return bool
    */
    function canSend(address _from, address _to, uint256 _amount) public returns (bool) {
        if (modules[TRANSFER_VALIDATOR_TYPE].length == 0) {
            return true;
        }
        bool isValid = true;
        for (uint8 i = 0; i < modules[TRANSFER_VALIDATOR_TYPE].length; i++) {
            if (modules[TRANSFER_VALIDATOR_TYPE][i] != address(0)) {
                isValid = ITransferValidator(
                    modules[TRANSFER_VALIDATOR_TYPE][i]
                ).canSend(this, _from, _to, _amount);                
            }

            if (!isValid) {
                break;
            }
        }
        return isValid;
    }

    /*----------- Burn Methods -----------*/
    /**
    * @dev Burn tokens from sender's address - adding onlyOwner modifier
    * @param _value uint256 the amount of tokens to be transferred
    */
    function burn(uint256 _value) 
        public
        onlyOwner
    {
        super.burn(_value);
    }

    /**
    * @dev Burn tokens from a non-sender address
    * @param _who token holder whose tokens are being burned
    * @param _value uint256 the amount of tokens to be transferred
    */
    function burnFrom(address _who, uint256 _value) 
        public
        onlyOwner
    {
        _burn(_who, _value);
    }
}