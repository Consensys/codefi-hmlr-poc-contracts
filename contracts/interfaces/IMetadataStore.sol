pragma solidity 0.4.24;

/**
 * @title Interface to be implemented by all Metadata Stores
 */

interface IMetadataStore {
    /*----------- Methods -----------*/
    function setLink(bytes32 _key, string _link) external;
    function getLinkByKey(bytes32 key) external view returns(string);
    // function getKeys() external view returns(bytes32[]);
}