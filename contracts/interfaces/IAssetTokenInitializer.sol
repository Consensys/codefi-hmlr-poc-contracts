pragma solidity 0.4.24;


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
