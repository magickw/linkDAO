// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title MultiSigWallet
 * @dev Multi-signature wallet for critical operations with time delays
 */
contract MultiSigWallet is ReentrancyGuard {
    using ECDSA for bytes32;
    
    // Transaction structure
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 confirmations;
        uint256 createdAt;
        uint256 executeAfter;
        string description;
    }
    
    // Wallet settings
    struct WalletSettings {
        uint256 requiredConfirmations;
        uint256 timeDelay;
        uint256 maxTimeDelay;
        bool emergencyMode;
    }
    
    WalletSettings public settings;
    
    address[] public owners;
    mapping(address => bool) public isOwner;
    mapping(uint256 => Transaction) public transactions;
    mapping(uint256 => mapping(address => bool)) public confirmations;
    
    uint256 public transactionCount;
    uint256 public constant MAX_OWNERS = 20;
    uint256 public constant MIN_REQUIRED = 2;
    
    // Events
    event OwnerAdded(address indexed owner);
    event OwnerRemoved(address indexed owner);
    event RequiredConfirmationsChanged(uint256 required);
    event TransactionSubmitted(
        uint256 indexed transactionId,
        address indexed to,
        uint256 value,
        bytes data,
        string description
    );
    event TransactionConfirmed(uint256 indexed transactionId, address indexed owner);
    event TransactionRevoked(uint256 indexed transactionId, address indexed owner);
    event TransactionExecuted(uint256 indexed transactionId);
    event EmergencyModeToggled(bool enabled);
    event TimeDelayChanged(uint256 newDelay);
    event GovernanceProposalCreated(
        uint256 indexed transactionId,
        address indexed treasury,
        uint256 value,
        string description
    );
    
    // Custom errors
    error NotOwner();
    error OwnerExists();
    error OwnerDoesNotExist();
    error InvalidRequiredConfirmations();
    error TransactionDoesNotExist();
    error TransactionAlreadyExecuted();
    error TransactionAlreadyConfirmed();
    error TransactionNotConfirmed();
    error InsufficientConfirmations();
    error TimeDelayNotMet();
    error InvalidTimeDelay();
    error TooManyOwners();
    error TransactionFailed();
    
    modifier onlyOwner() {
        if (!isOwner[msg.sender]) revert NotOwner();
        _;
    }
    
    modifier onlyWallet() {
        require(msg.sender == address(this), "Only wallet can call");
        _;
    }
    
    modifier transactionExists(uint256 transactionId) {
        if (transactionId >= transactionCount) revert TransactionDoesNotExist();
        _;
    }
    
    modifier notExecuted(uint256 transactionId) {
        if (transactions[transactionId].executed) revert TransactionAlreadyExecuted();
        _;
    }
    
    modifier notConfirmed(uint256 transactionId) {
        if (confirmations[transactionId][msg.sender]) revert TransactionAlreadyConfirmed();
        _;
    }
    
    constructor(
        address[] memory _owners,
        uint256 _requiredConfirmations,
        uint256 _timeDelay
    ) {
        require(_owners.length > 0 && _owners.length <= MAX_OWNERS, "Invalid owners count");
        require(_requiredConfirmations >= MIN_REQUIRED && _requiredConfirmations <= _owners.length, "Invalid required confirmations");
        require(_timeDelay <= 7 days, "Time delay too long");
        
        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "Invalid owner address");
            require(!isOwner[owner], "Duplicate owner");
            
            isOwner[owner] = true;
            owners.push(owner);
            emit OwnerAdded(owner);
        }
        
        settings = WalletSettings({
            requiredConfirmations: _requiredConfirmations,
            timeDelay: _timeDelay,
            maxTimeDelay: 7 days,
            emergencyMode: false
        });
    }
    
    /**
     * @dev Submit a new transaction
     */
    function submitTransaction(
        address to,
        uint256 value,
        bytes calldata data,
        string calldata description
    ) external onlyOwner returns (uint256 transactionId) {
        transactionId = transactionCount;
        
        uint256 executeAfter = settings.emergencyMode ? 
            block.timestamp : 
            block.timestamp + settings.timeDelay;
        
        transactions[transactionId] = Transaction({
            to: to,
            value: value,
            data: data,
            executed: false,
            confirmations: 0,
            createdAt: block.timestamp,
            executeAfter: executeAfter,
            description: description
        });
        
        transactionCount++;
        
        emit TransactionSubmitted(transactionId, to, value, data, description);
        
        // Auto-confirm by submitter
        confirmTransaction(transactionId);
    }
    
    /**
     * @dev Confirm a transaction
     */
    function confirmTransaction(uint256 transactionId)
        public
        onlyOwner
        transactionExists(transactionId)
        notExecuted(transactionId)
        notConfirmed(transactionId)
    {
        confirmations[transactionId][msg.sender] = true;
        transactions[transactionId].confirmations++;
        
        emit TransactionConfirmed(transactionId, msg.sender);
        
        // Auto-execute if conditions are met
        if (canExecuteTransaction(transactionId)) {
            executeTransaction(transactionId);
        }
    }
    
    /**
     * @dev Revoke confirmation for a transaction
     */
    function revokeConfirmation(uint256 transactionId)
        external
        onlyOwner
        transactionExists(transactionId)
        notExecuted(transactionId)
    {
        if (!confirmations[transactionId][msg.sender]) revert TransactionNotConfirmed();
        
        confirmations[transactionId][msg.sender] = false;
        transactions[transactionId].confirmations--;
        
        emit TransactionRevoked(transactionId, msg.sender);
    }
    
    /**
     * @dev Execute a confirmed transaction
     */
    function executeTransaction(uint256 transactionId)
        public
        nonReentrant
        transactionExists(transactionId)
        notExecuted(transactionId)
    {
        Transaction storage txn = transactions[transactionId];
        
        if (txn.confirmations < settings.requiredConfirmations) {
            revert InsufficientConfirmations();
        }
        
        if (block.timestamp < txn.executeAfter) {
            revert TimeDelayNotMet();
        }
        
        txn.executed = true;

        (bool success, ) = txn.to.call{value: txn.value}(txn.data);
        if (!success) revert TransactionFailed();
        
        emit TransactionExecuted(transactionId);
    }
    
    /**
     * @dev Check if transaction can be executed
     */
    function canExecuteTransaction(uint256 transactionId) public view returns (bool) {
        Transaction storage txn = transactions[transactionId];
        
        return !txn.executed &&
               txn.confirmations >= settings.requiredConfirmations &&
               block.timestamp >= txn.executeAfter;
    }
    
    /**
     * @dev Add a new owner (requires wallet approval)
     */
    function addOwner(address owner) external onlyWallet {
        if (owner == address(0)) revert OwnerDoesNotExist();
        if (isOwner[owner]) revert OwnerExists();
        if (owners.length >= MAX_OWNERS) revert TooManyOwners();
        
        isOwner[owner] = true;
        owners.push(owner);
        
        emit OwnerAdded(owner);
    }
    
    /**
     * @dev Remove an owner (requires wallet approval)
     */
    function removeOwner(address owner) external onlyWallet {
        if (!isOwner[owner]) revert OwnerDoesNotExist();
        require(owners.length > settings.requiredConfirmations, "Cannot remove owner");
        
        isOwner[owner] = false;
        
        // Remove from owners array
        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] == owner) {
                owners[i] = owners[owners.length - 1];
                owners.pop();
                break;
            }
        }
        
        emit OwnerRemoved(owner);
    }
    
    /**
     * @dev Change required confirmations (requires wallet approval)
     */
    function changeRequiredConfirmations(uint256 _required) external onlyWallet {
        if (_required < MIN_REQUIRED || _required > owners.length) {
            revert InvalidRequiredConfirmations();
        }
        
        settings.requiredConfirmations = _required;
        emit RequiredConfirmationsChanged(_required);
    }
    
    /**
     * @dev Change time delay (requires wallet approval)
     */
    function changeTimeDelay(uint256 _timeDelay) external onlyWallet {
        if (_timeDelay > settings.maxTimeDelay) revert InvalidTimeDelay();
        
        settings.timeDelay = _timeDelay;
        emit TimeDelayChanged(_timeDelay);
    }
    
    /**
     * @dev Toggle emergency mode (requires wallet approval)
     */
    function toggleEmergencyMode() external onlyWallet {
        settings.emergencyMode = !settings.emergencyMode;
        emit EmergencyModeToggled(settings.emergencyMode);
    }
    
    /**
     * @dev Get transaction details
     */
    function getTransaction(uint256 transactionId) external view returns (
        address to,
        uint256 value,
        bytes memory data,
        bool executed,
        uint256 _confirmations,
        uint256 createdAt,
        uint256 executeAfter,
        string memory description
    ) {
        Transaction storage txn = transactions[transactionId];
        return (
            txn.to,
            txn.value,
            txn.data,
            txn.executed,
            txn.confirmations,
            txn.createdAt,
            txn.executeAfter,
            txn.description
        );
    }
    
    /**
     * @dev Get confirmation status for a transaction
     */
    function getConfirmations(uint256 transactionId) external view returns (address[] memory) {
        address[] memory confirmingOwners = new address[](transactions[transactionId].confirmations);
        uint256 count = 0;
        
        for (uint256 i = 0; i < owners.length; i++) {
            if (confirmations[transactionId][owners[i]]) {
                confirmingOwners[count] = owners[i];
                count++;
            }
        }
        
        return confirmingOwners;
    }
    
    /**
     * @dev Get all owners
     */
    function getOwners() external view returns (address[] memory) {
        return owners;
    }
    
    /**
     * @dev Get pending transactions
     */
    function getPendingTransactions() external view returns (uint256[] memory) {
        uint256[] memory pending = new uint256[](transactionCount);
        uint256 count = 0;
        
        for (uint256 i = 0; i < transactionCount; i++) {
            if (!transactions[i].executed) {
                pending[count] = i;
                count++;
            }
        }
        
        // Resize array
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = pending[i];
        }
        
        return result;
    }
    
    /**
     * @dev Get executable transactions
     */
    function getExecutableTransactions() external view returns (uint256[] memory) {
        uint256[] memory executable = new uint256[](transactionCount);
        uint256 count = 0;
        
        for (uint256 i = 0; i < transactionCount; i++) {
            if (canExecuteTransaction(i)) {
                executable[count] = i;
                count++;
            }
        }
        
        // Resize array
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = executable[i];
        }
        
        return result;
    }
    
    /**
     * @dev Get time remaining until transaction can be executed
     */
    function timeUntilExecution(uint256 transactionId) external view returns (uint256) {
        Transaction storage txn = transactions[transactionId];
        if (block.timestamp >= txn.executeAfter) return 0;
        return txn.executeAfter - block.timestamp;
    }
    
    /**
     * @dev Batch confirm multiple transactions
     */
    function batchConfirm(uint256[] calldata transactionIds) external onlyOwner {
        for (uint256 i = 0; i < transactionIds.length; i++) {
            if (!confirmations[transactionIds[i]][msg.sender] && 
                !transactions[transactionIds[i]].executed &&
                transactionIds[i] < transactionCount) {
                confirmTransaction(transactionIds[i]);
            }
        }
    }
    
    /**
     * @dev Emergency execute (only in emergency mode)
     */
    function emergencyExecute(uint256 transactionId) external onlyOwner {
        require(settings.emergencyMode, "Not in emergency mode");
        executeTransaction(transactionId);
    }
    
    /**
     * @dev Create a governance proposal for large treasury operations (only owners)
     * @param governance Governance contract address
     * @param treasury Treasury contract address
     * @param value Amount of ETH to transfer
     * @param data Calldata for the operation
     * @param description Description of the proposal
     */
    function createGovernanceProposal(
        address governance,
        address treasury,
        uint256 value,
        bytes calldata data,
        string calldata description
    ) external onlyOwner returns (uint256 proposalId) {
        require(governance != address(0), "Invalid governance address");
        require(treasury != address(0), "Invalid treasury address");
        require(value > 0 || data.length > 0, "No operation specified");
        
        // This function would interact with the governance contract to create a proposal
        // In a real implementation, this would call the governance contract's propose function
        // For now, we'll emit an event to indicate that a governance proposal should be created
        emit GovernanceProposalCreated(transactionCount, treasury, value, description);
        
        // In a real implementation, this would return the proposal ID from the governance contract
        // For now, we return the transaction ID as a placeholder
        return transactionCount;
    }
    
    // Receive ETH
    receive() external payable {}
    
    // Fallback function
    fallback() external payable {}
}