pragma solidity 0.4.24;

import "../AssetToken.sol";


contract VersionableAssetTokenMock is AssetToken {

    bool internal _initialized = false;

    event LogUpdateVersion(
        address _from,
        string _version,
        uint256 _timestamp
    );

    /*----------- initialize -----------*/
    function initialize(string _version) public {
        require(!_initialized);
        version = _version;
        _initialized = true;
    }
}