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
contract OwnedUpgradeabilityProxy is UpgradeabilityProxy {
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
