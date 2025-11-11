// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title LDAOBridgeToken
 * @notice Bridged LDAO token for destination chains (Polygon, Arbitrum)
 * @dev Mintable/burnable token controlled by bridge contract
 */
contract LDAOBridgeToken is ERC20, ERC20Permit, Ownable, Pausable {
    
    // Bridge contract address
    address public bridge;
    
    // Total supply cap (same as main token)
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    
    // Minting and burning events
    event BridgeMint(address indexed to, uint256 amount, bytes32 indexed txHash);
    event BridgeBurn(address indexed from, uint256 amount, bytes32 indexed txHash);
    event BridgeUpdated(address indexed oldBridge, address indexed newBridge);
    
    modifier onlyBridge() {
        require(msg.sender == bridge, "Only bridge can call this function");
        _;
    }
    
    constructor(
        string memory name,
        string memory symbol,
        address _bridge,
        address _owner
    )
        ERC20(name, symbol)
        ERC20Permit(name)
        Ownable(_owner)
    {
        require(_bridge != address(0), "Invalid bridge address");
        require(_owner != address(0), "Invalid owner address");

        bridge = _bridge;
    }
    
    /**
     * @notice Mint tokens (bridge only)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     * @param txHash Transaction hash from source chain
     */
    function bridgeMint(
        address to,
        uint256 amount,
        bytes32 txHash
    ) external onlyBridge whenNotPaused {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(totalSupply() + amount <= MAX_SUPPLY, "Would exceed max supply");
        
        _mint(to, amount);
        emit BridgeMint(to, amount, txHash);
    }
    
    /**
     * @notice Burn tokens (bridge only)
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     * @param txHash Transaction hash for tracking
     */
    function bridgeBurn(
        address from,
        uint256 amount,
        bytes32 txHash
    ) external onlyBridge whenNotPaused {
        require(from != address(0), "Cannot burn from zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(from) >= amount, "Insufficient balance to burn");
        
        _burn(from, amount);
        emit BridgeBurn(from, amount, txHash);
    }
    
    /**
     * @notice Update bridge contract address (owner only)
     * @param newBridge New bridge contract address
     */
    function updateBridge(address newBridge) external onlyOwner {
        require(newBridge != address(0), "Invalid bridge address");
        require(newBridge != bridge, "Same bridge address");
        
        address oldBridge = bridge;
        bridge = newBridge;
        
        emit BridgeUpdated(oldBridge, newBridge);
    }
    
    /**
     * @notice Pause token operations
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause token operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}