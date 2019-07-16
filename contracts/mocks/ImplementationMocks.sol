pragma solidity 0.4.24;


contract ImplementationMock_v0 {

    uint CONSTANT_1;
    uint internal _answer;

    function initialize() public {
        CONSTANT_1 = 1;
        _answer = 42;
    }

    function seekPure() public pure returns (uint theAnswer) {
        return 42;
    }

    function answer() public view returns (uint theAnswer) {
        return _answer;
    }

    function getMemSlot0() public view returns (uint constant1) {
        assembly { // solhint-disable-line
            constant1 := sload(0x0)
        }
    }
}


contract ImplementationMock_v1 {

    bool CONSTANT_BOOL;
    uint internal _answer2;

    function initialize() public {
        CONSTANT_BOOL = true;
        _answer2 = 84;
    }

    function seekPure() public pure returns (uint theAnswer) {
        return 84;
    }

    function answer2() public view returns (uint theAnswer) {
        return _answer2;
    }

    function getMemSlot0() public view returns (bool constant1) {
        assembly { // solhint-disable-line
            constant1 := sload(0x0)
        }
    }
}

contract ImplementationMock_v2 is ImplementationMock_v1{

    uint internal _answer3;

    function initialize() public {
        _answer3 = 126;
        // super.initialize();
    }

    function answer3() public view returns (uint theAnswer) {
        return _answer3;
    }
}