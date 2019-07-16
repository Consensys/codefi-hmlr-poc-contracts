pragma solidity 0.4.24;

import "../interfaces/IMetadataStore.sol";

/**
 * @title Base for Metadata Stores, sets moduleType and inherits Interface
 */

contract MetadataStore is IMetadataStore {

    /*----------- Constants -----------*/
    uint8 constant moduleType = 2;
}