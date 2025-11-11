// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PaymentRouter is Ownable {
    using SafeERC20 for IERC20;
    
    // Mapping of supported tokens
    mapping(address => bool) public supportedTokens;
    
    // Payment fee (in basis points, 100 = 1%)
    uint256 public feeBasisPoints;
    
    // Fee collector address
    address public feeCollector;
    
    event PaymentSent(
        address indexed from,
        address indexed to,
        address token,
        uint256 amount,
        uint256 fee,
        string memo
    );
    
    event TokenSupported(address token, bool supported);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeCollectorUpdated(address oldCollector, address newCollector);
    
    constructor(uint256 _feeBasisPoints, address _feeCollector) Ownable(msg.sender) {
        require(_feeCollector != address(0), "Invalid fee collector");
        feeBasisPoints = _feeBasisPoints;
        feeCollector = _feeCollector;
    }
    
    /**
     * @dev Add or remove a token from the supported list
     * @param token The token address
     * @param supported Whether to support the token
     */
    function setTokenSupported(address token, bool supported) external onlyOwner {
        supportedTokens[token] = supported;
        emit TokenSupported(token, supported);
    }
    
    /**
     * @dev Update the fee percentage
     * @param _feeBasisPoints New fee in basis points
     */
    function setFee(uint256 _feeBasisPoints) external onlyOwner {
        require(_feeBasisPoints <= 1000, "Fee too high"); // Max 10%
        emit FeeUpdated(feeBasisPoints, _feeBasisPoints);
        feeBasisPoints = _feeBasisPoints;
    }
    
    /**
     * @dev Update the fee collector address
     * @param _feeCollector New fee collector address
     */
    function setFeeCollector(address _feeCollector) external onlyOwner {
        require(_feeCollector != address(0), "Invalid fee collector");
        emit FeeCollectorUpdated(feeCollector, _feeCollector);
        feeCollector = _feeCollector;
    }
    
    /**
     * @dev Send payment in ETH
     * @param to Recipient address
     * @param amount Amount to send
     * @param memo Optional memo
     */
    function sendEthPayment(address to, uint256 amount, string calldata memo) external payable {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");
        require(amount <= msg.value, "Insufficient ETH");
        
        uint256 fee = (amount * feeBasisPoints) / 10000;
        uint256 netAmount = amount - fee;
        
        // Send fee to collector
        if (fee > 0) {
            payable(feeCollector).transfer(fee);
        }
        
        // Send net amount to recipient
        payable(to).transfer(netAmount);
        
        emit PaymentSent(msg.sender, to, address(0), amount, fee, memo);
    }
    
    /**
     * @dev Send payment in ERC20 token
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to send
     * @param memo Optional memo
     */
    function sendTokenPayment(address token, address to, uint256 amount, string calldata memo) external {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");
        require(supportedTokens[token], "Token not supported");
        
        uint256 fee = (amount * feeBasisPoints) / 10000;
        uint256 netAmount = amount - fee;
        
        // Transfer fee to collector
        if (fee > 0) {
            IERC20(token).safeTransferFrom(msg.sender, feeCollector, fee);
        }
        
        // Transfer net amount to recipient
        IERC20(token).safeTransferFrom(msg.sender, to, netAmount);
        
        emit PaymentSent(msg.sender, to, token, amount, fee, memo);
    }
    
    /**
     * @dev Withdraw ETH accidentally sent to contract
     */
    function withdrawEth() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    /**
     * @dev Withdraw ERC20 tokens accidentally sent to contract
     * @param token Token address
     */
    function withdrawToken(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransfer(owner(), balance);
    }
    
    // Receive ETH
    receive() external payable {}
}