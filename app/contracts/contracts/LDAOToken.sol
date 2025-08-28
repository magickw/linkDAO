// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LDAOToken is ERC20Permit, Ownable {
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    
    constructor(address treasury) 
        ERC20("LinkDAO Token", "LDAO") 
        ERC20Permit("LinkDAO Token")
        Ownable(msg.sender)
    {
        _mint(treasury, INITIAL_SUPPLY);
    }
}