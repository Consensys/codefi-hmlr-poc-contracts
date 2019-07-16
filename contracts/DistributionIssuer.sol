pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";

/**
 * @title Batch transfer distributions to payees
 */

contract DistributionIssuer {
    /*----------- Constants -----------*/
    uint public constant MAX_PAYEES_LENGTH = 70;

    /*----------- Events -----------*/
    event DistributionIssued(
        address indexed _tokenAddress,
        address indexed _from,
        address indexed _payee,
        uint256 _tokenAmount
    );

    /**
    * @notice A user can push dividends to provided payees
    * @param _tokenAddress The address of the token to pay out
    * @param _payees Addresses to which to push the dividend
    * @param _tokenAmounts The amount in tokens to push out to the payees
    */
    function pushDistributionsToAddresses(
        address _tokenAddress,
        address[] _payees,
        uint256[] _tokenAmounts
    ) external {
        require(_payees.length < MAX_PAYEES_LENGTH, "Number of payees must be less than MAX_PAYEES_LENGTH");
        require(_payees.length == _tokenAmounts.length, "Payee and token amount arrays must be the same length");
        for (uint256 i = 0; i < _payees.length; i++) {
            _issueDistribution(_tokenAddress, msg.sender, _payees[i], _tokenAmounts[i]);
        }
    }

    /**
    * @notice Issuing a distribution to a single payee
    * @param _tokenAddress The address of the token to pay out
    * @param _from Address distributing the tokens
    * @param _payee Address to which to push the distribution
    * @param _tokenAmount The amount in tokens to push out to the payee
    */
    function _issueDistribution(
        address _tokenAddress,
        address _from,
        address _payee,
        uint256 _tokenAmount
    ) internal {
        require(
            StandardToken(_tokenAddress).transferFrom(
                _from,
                _payee,
                _tokenAmount
            ), 
            "Unable to transfer tokens"
        );
        emit DistributionIssued(_tokenAddress, _from, _payee, _tokenAmount);
    }
}