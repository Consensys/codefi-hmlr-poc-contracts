pragma solidity 0.4.24;

import {OwnedUpgradeabilityProxy as ProxyToken} from "../proxy/OwnedUpgradeabilityProxy.sol";
import "openzeppelin-solidity/contracts/lifecycle/TokenDestructible.sol";
import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "../interfaces/IAssetTokenInitializer.sol";


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