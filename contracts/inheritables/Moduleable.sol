pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../interfaces/IModuleContract.sol";

/**
 * @title Moduleable
 * @dev Base contract which allows children to add or remove module contracts
 */
contract Moduleable is Ownable {
    /*----------- Globals -----------*/
    mapping (uint8 => address[]) public modules;

    /*----------- Events -----------*/
    event LogModuleAdded(
      uint8 moduleType,
      bytes32 moduleName,
      address moduleAddress,
      uint256 timestamp
    );

    event LogModuleRemoved(
      uint8 moduleType,
      address moduleAddress,
      uint256 timestamp
    );

    event LogModuleIndexUpdate(
      uint256 moduleIndex,
      uint8 moduleType,
      address moduleAddress,
      uint256 timestamp
    );

    /*----------- Methods -----------*/
    /**
    * @notice Function used to attach the module to the Asset Token
    * @param _moduleAddress Contract address of the module that needs to be attached
    */
    function addModule(
        IModuleContract _moduleAddress
    ) external onlyOwner {
        // Add to Asset Token module map    
        IModuleContract moduleContract = IModuleContract(_moduleAddress);
        uint8 moduleType = moduleContract.getType();

        bytes32 moduleName = moduleContract.getName();

        // Resolves the case where modules were added, then all removed, and new modules added.
        if (modules[moduleType].length == 1 && modules[moduleType][0] == address(0)) {
            modules[moduleType][0] = _moduleAddress;
        } else {
            modules[moduleType].push(_moduleAddress);        
        }

        // Emit log event
        emit LogModuleAdded(
            moduleType,
            moduleName,
            _moduleAddress,
            block.timestamp // solhint-disable-line not-rely-on-time
        );

        // Emit Index event
        emit LogModuleIndexUpdate(
            modules[moduleType].length - 1,
            moduleType,
            _moduleAddress,
            block.timestamp // solhint-disable-line not-rely-on-time
        );
    }

    /**
    * @notice Removes a module attached to the Asset Token
    * @param _moduleType is which type of module we are trying to remove
    * @param _moduleIndex is the index of the module within the chosen type
    */
    function removeModule(
        uint8 _moduleType,
        uint8 _moduleIndex
    ) external onlyOwner {
        require(
            _moduleIndex < modules[_moduleType].length,
            "Module index is out of range"
        );
        require(
            modules[_moduleType][_moduleIndex] != address(0),
            "Module contract address should not be 0x"
        );

        // Emit the event before removing the index
        emit LogModuleRemoved(
            _moduleType,
            modules[_moduleType][_moduleIndex],
            block.timestamp // solhint-disable-line not-rely-on-time
        );

        uint lastIndex = modules[_moduleType].length - 1;
        if (lastIndex == 0) {
            modules[_moduleType][0] = address(0);
        } else {
            modules[_moduleType][_moduleIndex] = modules[_moduleType][lastIndex];
            delete modules[_moduleType][lastIndex];
            modules[_moduleType].length = lastIndex;
            if (_moduleIndex != lastIndex) {
                // Emit an event describing the new index of the moved module
                emit LogModuleIndexUpdate(
                    _moduleIndex,
                    _moduleType,
                    modules[_moduleType][_moduleIndex],
                    block.timestamp // solhint-disable-line not-rely-on-time
                );
            }
        }

    }

    /**
    * @notice Returns module name and address for a given type and index
    * @param _moduleType is the type of module we are searching for
    * @param _moduleIndex is the index of the module within the chosen type
    * @return bytes32 is the name of the module
    * @return address is the address of the module
    */
    function getModuleByTypeAndIndex(
        uint8 _moduleType,
        uint _moduleIndex
    ) external view returns (address) {
        if (modules[_moduleType].length > 0 && _moduleIndex < modules[_moduleType].length) {
            return modules[_moduleType][_moduleIndex];
        } else {
            return (address(0));
        }
    }
}