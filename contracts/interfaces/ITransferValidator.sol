pragma solidity 0.4.24;

/**
 * @title Interface to be implemented by all Transfer Validators
 */

interface ITransferValidator {
    /*----------- Methods -----------*/
    function canSend(address _token, address _from, address _to, uint256 _amount) external returns(bool);
}

