pragma solidity 0.4.24;

/**
 * @title Interface that any module contract should implement
 */

interface IModuleContract {
    /**
    * @notice Name of the module
    */
    function getName() external view returns(bytes32);

    /**
    * @notice Type of the module
    */
    function getType() external view returns(uint8);
}