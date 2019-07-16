pragma solidity 0.4.24;

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