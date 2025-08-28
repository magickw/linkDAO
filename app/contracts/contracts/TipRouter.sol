// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TipRouter is Ownable {
    IERC20 public immutable ldao;
    address public rewardPool;
    uint96 public feeBps = 1000; // 10%

    event Tipped(bytes32 indexed postId, address indexed from, address indexed to, uint256 amount, uint256 fee);

    constructor(address _ldao, address _rewardPool) Ownable(msg.sender) {
        ldao = IERC20(_ldao);
        rewardPool = _rewardPool;
    }

    function setFeeBps(uint96 _bps) external onlyOwner {
        require(_bps <= 2000, "max 20%");
        feeBps = _bps;
    }

    // Standard ERC20 flow (user must approve TipRouter to spend LDAO)
    function tip(bytes32 postId, address creator, uint256 amount) external {
        uint256 fee = (amount * feeBps) / 10_000;
        uint256 toCreator = amount - fee;
        require(ldao.transferFrom(msg.sender, creator, toCreator), "transfer fail");
        require(ldao.transferFrom(msg.sender, rewardPool, fee), "fee fail");
        emit Tipped(postId, msg.sender, creator, amount, fee);
    }

    // Permit + tip in one call (gasless approvals)
    function permitAndTip(
        bytes32 postId,
        address creator,
        uint256 amount,
        uint256 deadline,
        uint8 v, bytes32 r, bytes32 s
    ) external {
        ERC20Permit(address(ldao)).permit(msg.sender, address(this), amount, deadline, v, r, s);
        tip(postId, creator, amount);
    }
}