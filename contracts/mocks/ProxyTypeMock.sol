pragma solidity 0.4.24;

import "../proxy/Proxy.sol";

// mock class using Proxy
contract ProxyTypeMock is Proxy {

    constructor(uint256 _proxyTypeId) public {
        setProxyTypeId(_proxyTypeId);
    }

    function implementation() public view returns (address impl) {
        return address(this);
    }
}