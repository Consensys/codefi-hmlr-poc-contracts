pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title Simple Link Registry - A repository storing links issued about any other Ethereum address
 */
contract SimpleLinkRegistry is Ownable {
    /*----------- Variables -----------*/
    mapping(
        address => mapping(
            bytes32 => string
        )
    ) public registry;

    event LinkSet(
        address from,
        address indexed subject,
        bytes32 indexed key,
        string value,
        uint updatedAt
    );

    /**
    * @dev Create or update a link
    * @param subject - The address the link is being issued to
    * @param key - The key used to identify the link
    * @param value - The data associated with the link
    */
    function setLink(
        address subject,
        bytes32 key,
        string value
    ) 
        external 
        onlyOwner 
    {
        registry[subject][key] = value;
        emit LinkSet(
            msg.sender,
            subject,
            key,
            value, 
            block.timestamp // solhint-disable-line not-rely-on-time
        );
    }

    /**
    * @dev Allows a user to retrieve a link
    * @param subject - The address to which the link was issued to
    * @param key - The key used to identify the link
    */
    function getLink(
        address subject,
        bytes32 key
    ) 
        external 
        view
        returns(string) 
    {
        return registry[subject][key];
    }
}