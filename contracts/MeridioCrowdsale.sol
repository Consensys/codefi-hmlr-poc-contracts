pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/crowdsale/emission/AllowanceCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "openzeppelin-solidity/contracts/lifecycle/TokenDestructible.sol";
import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";

contract MeridioCrowdsale is AllowanceCrowdsale, TimedCrowdsale, TokenDestructible, Pausable {
    using SafeERC20 for ERC20;

    event RateUpdated(
        address sender,
        uint newRate
    );

    constructor(
        uint256 _openingTime,
        uint256 _closingTime,
        uint256 _rate,
        ERC20 _token
    )
        public
        Crowdsale(_rate, msg.sender, _token)
        AllowanceCrowdsale(msg.sender)
        TimedCrowdsale(_openingTime, _closingTime) {
    }

    function updateRate(
        uint newRate
    ) 
        external 
        onlyOwner
        returns(uint _rate)
    {
        rate = newRate;
        emit RateUpdated(msg.sender, rate);
        return rate;
    }
}