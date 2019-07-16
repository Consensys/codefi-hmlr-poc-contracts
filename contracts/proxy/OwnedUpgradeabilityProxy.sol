pragma solidity 0.4.24;

import "./UpgradeabilityProxy.sol";

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
    function upgradeToAndCall(address implementation, bytes data) public payable onlyProxyOwner {
        upgradeTo(implementation);
        require(address(this).call.value(msg.value)(data)); // solhint-disable-line avoid-call-value
    }
}