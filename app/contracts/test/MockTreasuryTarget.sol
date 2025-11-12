// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockTreasuryTarget {
    uint256 public testValue;
    bool public operationExecuted;
    
    function testFunction() external {
        testValue = 42;
        operationExecuted = true;
    }
    
    function testFunctionWithParams(uint256 value) external {
        testValue = value;
        operationExecuted = true;
    }
    
    receive() external payable {}
}