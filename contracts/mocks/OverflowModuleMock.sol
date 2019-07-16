pragma solidity 0.4.24;

/**
 * @title Transfer Validator that pauses transfers and unpauses transfers
 */

contract OverflowModuleMock {

  /*----------- Constants -----------*/
    bytes32 public constant moduleName = "OverflowModuleMock";
    uint constant moduleType = 257;

  /*----------- Methods -----------*/
    function validateTransfer(address _token, address _from, address _to, uint256 _amount)
        public
        view
        returns(bool)
    {
        return true;
    }

    function getName()
        public
        view
        returns(bytes32)
    {
        return moduleName;
    }

    function getType()
        public
        view
        returns(uint)
    {
        return moduleType;
    }
}
