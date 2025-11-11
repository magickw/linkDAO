// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RewardPool is Ownable {
    IERC20 public immutable ldao;
    uint256 public currentEpoch;

    struct Account {
        uint256 earned; // claimable
        uint256 lastEpochCounted;
    }

    mapping(address => Account) public accounts;

    event Funded(uint256 epoch, uint256 amount);
    event Claimed(address indexed user, uint256 amount);

    constructor(address _ldao) { 
        ldao = IERC20(_ldao); 
    }

    function fund(uint256 amount) external {
        require(ldao.transferFrom(msg.sender, address(this), amount), "fund fail");
        emit Funded(currentEpoch, amount);
    }

    // Hook this to your indexer math: update accounts.earned off-chain and push via a trusted executor (or do pure onchain if simple).
    function credit(address user, uint256 amount) external /* onlyIndexerOrGov */ {
        accounts[user].earned += amount;
    }

    function claim() external {
        uint256 amt = accounts[msg.sender].earned;
        require(amt > 0, "nothing");
        accounts[msg.sender].earned = 0;
        (bool sent, ) = ldao.transfer(msg.sender, amt);
        require(sent, "transfer fail");
        emit Claimed(msg.sender, amt);
    }
}