// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TaxEscrowContract
 * @dev Manages separate tax escrow accounts for cryptocurrency transactions
 * Ensures tax funds are kept separate from platform revenue and seller funds
 */
contract TaxEscrowContract is AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant TAX_AUTHORITY_ROLE = keccak256("TAX_AUTHORITY_ROLE");
    bytes32 public constant ESCROW_MANAGER_ROLE = keccak256("ESCROW_MANAGER_ROLE");

    struct TaxLiability {
        uint256 escrowId;
        uint256 taxAmount;
        string jurisdiction; // e.g., "US-CA", "GB", "DE"
        address tokenAddress; // ERC20 token address, address(0) for native ETH
        uint256 dueDate;
        uint256 collectionDate;
        bool remitted;
        uint256 remittedDate;
        string remittanceReference;
    }

    struct TaxBatch {
        uint256 batchId;
        string batchNumber;
        uint256 periodStart;
        uint256 periodEnd;
        uint256 totalTaxAmount;
        mapping(string => uint256) jurisdictionBreakdown;
        uint256 liabilitiesCount;
        bool filed;
        uint256 filedDate;
        bool remitted;
        uint256 remittedDate;
        string status; // "pending", "filed", "paid"
    }

    // Storage
    mapping(uint256 => TaxLiability) public taxLiabilities;
    mapping(uint256 => TaxBatch) public taxBatches;
    mapping(string => uint256) public jurisdictionBalance;
    mapping(address => mapping(address => uint256)) public tokenBalances; // token => jurisdiction => balance

    uint256 public nextLiabilityId;
    uint256 public nextBatchId;
    uint256 public totalTaxCollected;

    // Events
    event TaxLiabilityCreated(
        uint256 indexed liabilityId,
        uint256 escrowId,
        uint256 taxAmount,
        string jurisdiction,
        uint256 dueDate
    );

    event TaxBatchCreated(
        uint256 indexed batchId,
        string batchNumber,
        uint256 totalAmount,
        uint256 liabilitiesCount
    );

    event TaxRemitted(
        uint256 indexed batchId,
        string jurisdiction,
        uint256 amount,
        string remittanceReference
    );

    event TaxFunded(
        uint256 indexed liabilityId,
        uint256 amount,
        address indexed tokenAddress
    );

    event TaxReleased(
        uint256 indexed batchId,
        string jurisdiction,
        address indexed recipient,
        uint256 amount
    );

    constructor(address initialAdmin) {
        _setupRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _setupRole(ADMIN_ROLE, initialAdmin);
        _setupRole(ESCROW_MANAGER_ROLE, initialAdmin);
    }

    /**
     * @dev Create a tax liability record
     */
    function createTaxLiability(
        uint256 escrowId,
        uint256 taxAmount,
        string calldata jurisdiction,
        address tokenAddress,
        uint256 dueDate
    ) external onlyRole(ESCROW_MANAGER_ROLE) returns (uint256) {
        require(taxAmount > 0, "Tax amount must be greater than 0");
        require(dueDate > block.timestamp, "Due date must be in the future");

        uint256 liabilityId = nextLiabilityId++;

        taxLiabilities[liabilityId] = TaxLiability({
            escrowId: escrowId,
            taxAmount: taxAmount,
            jurisdiction: jurisdiction,
            tokenAddress: tokenAddress,
            dueDate: dueDate,
            collectionDate: block.timestamp,
            remitted: false,
            remittedDate: 0,
            remittanceReference: ""
        });

        emit TaxLiabilityCreated(
            liabilityId,
            escrowId,
            taxAmount,
            jurisdiction,
            dueDate
        );

        return liabilityId;
    }

    /**
     * @dev Fund a tax liability (move funds into escrow)
     */
    function fundTaxLiability(
        uint256 liabilityId,
        uint256 amount,
        address tokenAddress
    ) external nonReentrant {
        require(liabilityId < nextLiabilityId, "Invalid liability ID");

        TaxLiability storage liability = taxLiabilities[liabilityId];
        require(amount == liability.taxAmount, "Amount must match tax liability");

        if (tokenAddress == address(0)) {
            // Native token (ETH)
            require(msg.value == amount, "ETH amount mismatch");
        } else {
            // ERC20 token
            require(
                IERC20(tokenAddress).transferFrom(
                    msg.sender,
                    address(this),
                    amount
                ),
                "Token transfer failed"
            );
        }

        jurisdictionBalance[liability.jurisdiction] += amount;
        totalTaxCollected += amount;

        emit TaxFunded(liabilityId, amount, tokenAddress);
    }

    /**
     * @dev Create a tax remittance batch
     */
    function createTaxBatch(
        string calldata batchNumber,
        uint256 periodStart,
        uint256 periodEnd,
        uint256 totalAmount,
        uint256 liabilitiesCount
    ) external onlyRole(ADMIN_ROLE) returns (uint256) {
        uint256 batchId = nextBatchId++;

        TaxBatch storage batch = taxBatches[batchId];
        batch.batchId = batchId;
        batch.batchNumber = batchNumber;
        batch.periodStart = periodStart;
        batch.periodEnd = periodEnd;
        batch.totalTaxAmount = totalAmount;
        batch.liabilitiesCount = liabilitiesCount;
        batch.status = "pending";

        emit TaxBatchCreated(batchId, batchNumber, totalAmount, liabilitiesCount);

        return batchId;
    }

    /**
     * @dev Mark tax as filed with authorities
     */
    function fileTaxBatch(uint256 batchId) external onlyRole(ADMIN_ROLE) {
        require(batchId < nextBatchId, "Invalid batch ID");

        TaxBatch storage batch = taxBatches[batchId];
        batch.filed = true;
        batch.filedDate = block.timestamp;
        batch.status = "filed";
    }

    /**
     * @dev Release tax funds to tax authority
     */
    function releaseTax(
        uint256 batchId,
        string calldata jurisdiction,
        address recipient,
        uint256 amount,
        address tokenAddress,
        string calldata remittanceReference
    ) external onlyRole(TAX_AUTHORITY_ROLE) nonReentrant {
        require(batchId < nextBatchId, "Invalid batch ID");
        require(amount > 0, "Amount must be greater than 0");
        require(
            jurisdictionBalance[jurisdiction] >= amount,
            "Insufficient balance"
        );

        TaxBatch storage batch = taxBatches[batchId];
        require(batch.filed, "Batch not filed yet");

        // Transfer funds to tax authority
        if (tokenAddress == address(0)) {
            (bool success, ) = recipient.call{ value: amount }("");
            require(success, "ETH transfer failed");
        } else {
            require(
                IERC20(tokenAddress).transfer(recipient, amount),
                "Token transfer failed"
            );
        }

        // Update state
        jurisdictionBalance[jurisdiction] -= amount;
        batch.remitted = true;
        batch.remittedDate = block.timestamp;
        batch.status = "paid";

        // Update liability records
        for (uint256 i = 0; i < nextLiabilityId; i++) {
            if (
                keccak256(abi.encodePacked(taxLiabilities[i].jurisdiction)) ==
                keccak256(abi.encodePacked(jurisdiction)) &&
                !taxLiabilities[i].remitted
            ) {
                taxLiabilities[i].remitted = true;
                taxLiabilities[i].remittedDate = block.timestamp;
                taxLiabilities[i].remittanceReference = remittanceReference;
            }
        }

        emit TaxRemitted(batchId, jurisdiction, amount, remittanceReference);
        emit TaxReleased(batchId, jurisdiction, recipient, amount);
    }

    /**
     * @dev Get total tax balance for a jurisdiction
     */
    function getJurisdictionBalance(
        string calldata jurisdiction
    ) external view returns (uint256) {
        return jurisdictionBalance[jurisdiction];
    }

    /**
     * @dev Get tax liability details
     */
    function getTaxLiability(
        uint256 liabilityId
    ) external view returns (TaxLiability memory) {
        require(liabilityId < nextLiabilityId, "Invalid liability ID");
        return taxLiabilities[liabilityId];
    }

    /**
     * @dev Check if tax is overdue
     */
    function isTaxOverdue(uint256 liabilityId) external view returns (bool) {
        require(liabilityId < nextLiabilityId, "Invalid liability ID");
        return !taxLiabilities[liabilityId].remitted &&
            block.timestamp > taxLiabilities[liabilityId].dueDate;
    }

    /**
     * @dev Get total tax collected
     */
    function getTotalTaxCollected() external view returns (uint256) {
        return totalTaxCollected;
    }

    /**
     * @dev Emergency withdrawal (only by admin, with approval)
     */
    function emergencyWithdraw(
        address payable recipient,
        uint256 amount
    ) external onlyRole(ADMIN_ROLE) {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");
        require(address(this).balance >= amount, "Insufficient balance");

        (bool success, ) = recipient.call{ value: amount }("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Receive ETH
     */
    receive() external payable {}
}
