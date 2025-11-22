// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MinimalStaking is Ownable {
    IERC20 public immutable ldaoToken;
    
    constructor(address _ldaoToken, address _owner) Ownable(_owner) {
        require(_ldaoToken != address(0), "Invalid LDAO token address");
        require(_owner != address(0), "Invalid owner address");
        
        ldaoToken = IERC20(_ldaoToken);
    }
}