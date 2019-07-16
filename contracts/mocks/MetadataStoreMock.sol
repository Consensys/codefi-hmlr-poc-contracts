pragma solidity 0.4.24;

import "../inheritables/MetadataStore.sol";

/**
 * @title Transfer Validator mock
 */

contract MetadataStoreMock is MetadataStore {

  /*----------- Constants -----------*/
    bytes32 public constant moduleName = "MetadataStoreMock";

  /*----------- Methods -----------*/
    function getType()
        external
        pure
        returns(uint8)
    {
        return moduleType;
    }
    function setLink(bytes32 _key, string _link) external {}
    function getLinkByKey(bytes32 key) external view returns(string) {
        return "test";
    }
    // function getKeys() external view returns(bytes32[]);
}
