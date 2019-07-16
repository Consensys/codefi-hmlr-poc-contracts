pragma solidity 0.4.24;

// File: contracts/proxy/ERCProxy.sol

/**
 * @title ERCProxy
 * @dev Based on ERC897 interface
 * @dev changed proxyType() from `pure` to `view` to accomodate assembly storage
 * See https://github.com/ethereum/EIPs/blob/master/EIPS/eip-897.md
 */
interface ERCProxy {
  /**
  * @dev Tells the type uint of the proxy.
  * @return type of the proxy type
  */
  function proxyType() public view returns (uint256 proxyTypeId);

  /**
  * @dev Tells the address of the implementation where every call will be delegated.
  * @return address of the implementation to which it will be delegated
  */
  function implementation() public view returns (address codeAddr);
}

// File: contracts/proxy/Proxy.sol

/**
 * @title Proxy
 * @dev Gives the possibility to delegate any call to a foreign implementation.
 * @dev source https://github.com/zeppelinos/labs/blob/master/upgradeability_using_unstructured_storage/contracts/Proxy.sol
 */
contract Proxy is ERCProxy {

    // Storage position of the address of the current implementation
    bytes32 private constant typeIdPosition = keccak256("org.meridio.proxy.typeId");

    /**
    * @dev Sets the proxyTypeId. Should be called from the Proxy constructor
    * @param _proxyTypeId uint representing Forwarding Proxy (id = 1) or Upgradeable Proxy (id = 2);
    */
    function setProxyTypeId (uint256 _proxyTypeId) internal {
        require(_proxyTypeId == 1 || _proxyTypeId == 2, "Must be type 1 or 2");
        bytes32 position = typeIdPosition;
        assembly { // solhint-disable-line
            sstore(position, _proxyTypeId)
        }
    }

    /**
    * @dev Tells the address of the current implementation
    * @return address of the current implementation
    */
    function proxyType() public view returns (uint256 proxyTypeId) {
        bytes32 position = typeIdPosition;
        assembly { // solhint-disable-line
            proxyTypeId := sload(position)
        }
    }

    /**
    * @dev Fallback function allowing to perform a delegatecall to the given implementation.
    * This function will return whatever the implementation call returns
    */
    function () payable public {
        address _impl = implementation();
        require(_impl != address(0));

        assembly { // solhint-disable-line
            let ptr := mload(0x40)
            calldatacopy(ptr, 0, calldatasize)
            let result := delegatecall(gas, _impl, ptr, calldatasize, 0, 0)
            let size := returndatasize
            returndatacopy(ptr, 0, size)

            switch result
            case 0 { revert(ptr, size) }
            default { return(ptr, size) }
        }
    }
}

// File: contracts/proxy/UpgradeabilityProxy.sol

/**
 * @title UpgradeabilityProxy
 * @dev This contract represents a proxy where the implementation address to which it will delegate can be upgraded
 * @dev source https://github.com/zeppelinos/labs/blob/master/upgradeability_using_unstructured_storage/contracts/UpgradeabilityProxy.sol
 */
contract UpgradeabilityProxy is Proxy {
    /**
    * @dev This event will be emitted every time the implementation gets upgraded
    * @param implementation representing the address of the upgraded implementation
    */
    event Upgraded(address indexed implementation);

    // Storage position of the address of the current implementation
    bytes32 private constant implementationPosition = keccak256("org.meridio.proxy.implementation");

    /**
    * @dev Constructor function
    */
    constructor() public {}

    /**
    * @dev Tells the address of the current implementation
    * @return address of the current implementation
    */
    function implementation() public view returns (address impl) {
        bytes32 position = implementationPosition;
        assembly { // solhint-disable-line
          impl := sload(position)
        }
    }

    /**
    * @dev Sets the address of the current implementation
    * @param newImplementation address representing the new implementation to be set
    */
    function setImplementation(address newImplementation) internal {
        bytes32 position = implementationPosition;
        assembly { // solhint-disable-line
          sstore(position, newImplementation)
        }
    }

    /**
    * @dev Upgrades the implementation address
    * @param newImplementation representing the address of the new implementation to be set
    */
    function _upgradeTo(address newImplementation) internal {
        address currentImplementation = implementation();
        require(currentImplementation != newImplementation);
        // require(newImplementation != address(0));
        setImplementation(newImplementation);
        emit Upgraded(newImplementation);
    }
}

// File: contracts/proxy/OwnedUpgradeabilityProxy.sol

/**
 * @title OwnedUpgradeabilityProxy
 * @dev This contract combines an upgradeability proxy with basic authorization control functionalities
 * @dev source https://github.com/zeppelinos/labs/blob/master/upgradeability_using_unstructured_storage/contracts/OwnedUpgradeabilityProxy.sol
 * @dev implementation notes:
 *         - constructors will not work, the proxied contract must be initialized after proxying.  That is what the upgradeToAndCall function is for.
 *         - if you do not inherit your version n-1 into version n, you will overwrite memory slots with the new contract.
 *         - if you inherit version n-1 into version n, you will preserve memory slots including the _initialized flag.
 *         - Therefore each new contract that needs to be initialized should have its own _initialized flag and function.
 */
contract ProxyToken is UpgradeabilityProxy {
    /**
    * @dev Event to show ownership has been transferred
    * @param previousOwner representing the address of the previous owner
    * @param newOwner representing the address of the new owner
    */
    event ProxyOwnershipTransferred(address previousOwner, address newOwner);

    // Storage position of the owner of the contract
    bytes32 private constant proxyOwnerPosition = keccak256("org.meridio.proxy.owner");

    /**
    * @dev the constructor sets the original owner of the contract to the sender account.
    */
    constructor() public {
        setUpgradeabilityOwner(msg.sender);
    }

    /**
    * @dev Throws if called by any account other than the owner.
    */
    modifier onlyProxyOwner() {
        require(msg.sender == proxyOwner(), "Must be proxy Owner");
        _;
    }

    /**
    * @dev Tells the address of the owner
    * @return the address of the owner
    */
    function proxyOwner() public view returns (address owner) {
        bytes32 position = proxyOwnerPosition;
        assembly { // solhint-disable-line
          owner := sload(position)
        }
    }

    /**
    * @dev Sets the address of the owner
    */
    function setUpgradeabilityOwner(address newProxyOwner) internal {
        bytes32 position = proxyOwnerPosition;
        assembly { // solhint-disable-line
          sstore(position, newProxyOwner)
        }
    }

    /**
    * @dev Allows the current owner to transfer control of the contract to a newOwner.
    * @param newOwner The address to transfer ownership to.
    */
    function transferProxyOwnership(address newOwner) 
        public 
        onlyProxyOwner 
    {
        require(newOwner != address(0));
        emit ProxyOwnershipTransferred(proxyOwner(), newOwner);
        setUpgradeabilityOwner(newOwner);
    }

    /**
    * @dev Allows the proxy owner to upgrade the current version of the proxy.
    * @param implementation representing the address of the new implementation to be set.
    */
    function upgradeTo(address implementation) public onlyProxyOwner {
        _upgradeTo(implementation);
    }

    /**
    * @dev Allows the proxy owner to upgrade the current version of the proxy and call the new implementation
    * to initialize whatever is needed through a low level call.
    * @param implementation representing the address of the new implementation to be set.
    * @param data represents the msg.data to bet sent in the low level call. This parameter may include the function
    * signature of the implementation to be called with the needed payload
    */
    function upgradeToAndCall(address implementation, bytes data) payable public onlyProxyOwner {
        upgradeTo(implementation);
        require(address(this).call.value(msg.value)(data)); // solhint-disable-line no-call-value
    }
}

// File: openzeppelin-solidity/contracts/ownership/Ownable.sol

/**
 * @title Ownable
 * @dev The Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
contract Ownable {
  address public owner;


  event OwnershipRenounced(address indexed previousOwner);
  event OwnershipTransferred(
    address indexed previousOwner,
    address indexed newOwner
  );


  /**
   * @dev The Ownable constructor sets the original `owner` of the contract to the sender
   * account.
   */
  constructor() public {
    owner = msg.sender;
  }

  /**
   * @dev Throws if called by any account other than the owner.
   */
  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }

  /**
   * @dev Allows the current owner to relinquish control of the contract.
   * @notice Renouncing to ownership will leave the contract without an owner.
   * It will not be possible to call the functions with the `onlyOwner`
   * modifier anymore.
   */
  function renounceOwnership() public onlyOwner {
    emit OwnershipRenounced(owner);
    owner = address(0);
  }

  /**
   * @dev Allows the current owner to transfer control of the contract to a newOwner.
   * @param _newOwner The address to transfer ownership to.
   */
  function transferOwnership(address _newOwner) public onlyOwner {
    _transferOwnership(_newOwner);
  }

  /**
   * @dev Transfers control of the contract to a newOwner.
   * @param _newOwner The address to transfer ownership to.
   */
  function _transferOwnership(address _newOwner) internal {
    require(_newOwner != address(0));
    emit OwnershipTransferred(owner, _newOwner);
    owner = _newOwner;
  }
}

// File: openzeppelin-solidity/contracts/token/ERC20/ERC20Basic.sol

/**
 * @title ERC20Basic
 * @dev Simpler version of ERC20 interface
 * See https://github.com/ethereum/EIPs/issues/179
 */
contract ERC20Basic {
  function totalSupply() public view returns (uint256);
  function balanceOf(address _who) public view returns (uint256);
  function transfer(address _to, uint256 _value) public returns (bool);
  event Transfer(address indexed from, address indexed to, uint256 value);
}

// File: openzeppelin-solidity/contracts/lifecycle/TokenDestructible.sol

/**
 * @title TokenDestructible:
 * @author Remco Bloemen <remco@2π.com>
 * @dev Base contract that can be destroyed by owner. All funds in contract including
 * listed tokens will be sent to the owner.
 */
contract TokenDestructible is Ownable {

  constructor() public payable { }

  /**
   * @notice Terminate contract and refund to owner
   * @param _tokens List of addresses of ERC20 or ERC20Basic token contracts to
   refund.
   * @notice The called token contracts could try to re-enter this contract. Only
   supply token contracts you trust.
   */
  function destroy(address[] _tokens) public onlyOwner {

    // Transfer tokens to owner
    for (uint256 i = 0; i < _tokens.length; i++) {
      ERC20Basic token = ERC20Basic(_tokens[i]);
      uint256 balance = token.balanceOf(this);
      token.transfer(owner, balance);
    }

    // Transfer Eth to owner and terminate contract
    selfdestruct(owner);
  }
}

// File: openzeppelin-solidity/contracts/lifecycle/Pausable.sol

/**
 * @title Pausable
 * @dev Base contract which allows children to implement an emergency stop mechanism.
 */
contract Pausable is Ownable {
  event Pause();
  event Unpause();

  bool public paused = false;


  /**
   * @dev Modifier to make a function callable only when the contract is not paused.
   */
  modifier whenNotPaused() {
    require(!paused);
    _;
  }

  /**
   * @dev Modifier to make a function callable only when the contract is paused.
   */
  modifier whenPaused() {
    require(paused);
    _;
  }

  /**
   * @dev called by the owner to pause, triggers stopped state
   */
  function pause() public onlyOwner whenNotPaused {
    paused = true;
    emit Pause();
  }

  /**
   * @dev called by the owner to unpause, returns to normal state
   */
  function unpause() public onlyOwner whenPaused {
    paused = false;
    emit Unpause();
  }
}

// File: contracts/interfaces/IAssetTokenInitializer.sol

/**
 * @title AssetToken V1.0 Initializer interface
 */
interface IAssetTokenInitializer {

  function initialize(
      address _owner,
      uint256 _initialAmount,
      string _name,
      uint8 _decimalUnits,
      string _symbol
  ) external;

}

// File: contracts/factories/ProxyTokenFactory.sol

/**
 * @title ProxyToken contract factory
 *
 * @dev Implementation of the ProxyToken contract factory.
 *      Launches Owned and Upgradeable Proxy Contracts,
 *      points them to the passed in implementation
 */
contract ProxyTokenFactory is TokenDestructible, Pausable {

    event ProxyTokenCreated(
      address indexed owner,
      address indexed implementationAddress,
      address indexed proxyTokenAddress,
      uint256 _initialSupply,
      string _name,
      uint8 _decimalUnits,
      string _symbol
    );

    function createProxyToken(
        IAssetTokenInitializer _implementation,
        uint256 _initialSupply,
        string _name,
        uint8 _decimalUnits,
        string _symbol
    ) 
        external
        whenNotPaused
        returns (address)
    {
        require(_implementation != address(0), "Implementation must not be address 0");
        require(_implementation != address(this), "Implementation must not be this address");

        ProxyToken proxyToken = new ProxyToken();

        proxyToken.upgradeTo(_implementation);

        IAssetTokenInitializer proxyTokenInitializer = IAssetTokenInitializer(address(proxyToken));
        proxyTokenInitializer.initialize(
            msg.sender,
            _initialSupply,
            _name,
            _decimalUnits,
            _symbol
        );

        proxyToken.transferProxyOwnership(msg.sender);
        
        emit ProxyTokenCreated(
            msg.sender,
            _implementation,
            proxyToken,
            _initialSupply,
            _name,
            _decimalUnits,
            _symbol
        );

        return proxyToken;
    }
}
