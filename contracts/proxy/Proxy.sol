pragma solidity 0.4.24;

import "./ERCProxy.sol";

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
    function () public payable {
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