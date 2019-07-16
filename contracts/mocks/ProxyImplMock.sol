pragma solidity 0.4.24;

import "../proxy/Proxy.sol";

// mock class using Proxy
contract ProxyImplMock is Proxy {

    bytes32 private constant implementationPosition = keccak256("org.meridio.proxy.implementation");

    constructor(address _implementation) public {
        setImplementation(_implementation);
    }

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
}