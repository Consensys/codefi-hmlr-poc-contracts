pragma solidity 0.4.24;

import "../proxy/Proxy.sol";

/**
 * @title UpgradeabilityProxyMock
 * @dev This contract represents a proxy mock for testing where the implementation address to which it will delegate can be upgraded
 */
contract UpgradeabilityProxyMock is Proxy {
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
    constructor(address _implementation) public {
        setImplementation(_implementation);
    }

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
    * @dev Allows the proxy owner to upgrade the current version of the proxy.
    * @param implementation representing the address of the new implementation to be set.
    */
    function upgradeTo(address implementation) public {
        _upgradeTo(implementation);
    }

    /**
    * @dev Allows the proxy owner to upgrade the current version of the proxy and call the new implementation
    * to initialize whatever is needed through a low level call.
    * @param implementation representing the address of the new implementation to be set.
    * @param data represents the msg.data to bet sent in the low level call. This parameter may include the function
    * signature of the implementation to be called with the needed payload
    */
    function upgradeToAndCall(address implementation, bytes data) payable public {
        upgradeTo(implementation);
        require(address(this).call.value(msg.value)(data)); // solhint-disable-line no-call-value
    }

    /**
    * @dev Upgrades the implementation address
    * @param newImplementation representing the address of the new implementation to be set
    */
    function _upgradeTo(address newImplementation) internal {
        address currentImplementation = implementation();
        require(currentImplementation != newImplementation);
        require(newImplementation != address(0));
        setImplementation(newImplementation);
        emit Upgraded(newImplementation);
    }
}