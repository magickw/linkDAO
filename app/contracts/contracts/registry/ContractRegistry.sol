// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title ContractRegistry
 * @dev Central registry for all deployed contract addresses with versioning
 */
contract ContractRegistry is Ownable, Pausable {
    
    // Contract information structure
    struct ContractInfo {
        address contractAddress;
        uint256 version;
        uint256 deployedAt;
        bool isActive;
        string description;
        bytes32 codeHash;
    }
    
    // Registry mappings
    mapping(bytes32 => ContractInfo) private _contracts;
    mapping(bytes32 => address[]) private _contractVersions;
    mapping(address => bytes32) private _addressToName;
    
    // Contract categories
    mapping(bytes32 => bytes32[]) private _categories;
    mapping(bytes32 => bytes32) private _contractCategories;
    
    bytes32[] private _allContractNames;
    bytes32[] private _allCategories;
    
    // Events
    event ContractRegistered(
        bytes32 indexed name,
        address indexed contractAddress,
        uint256 version,
        string description
    );
    
    event ContractUpdated(
        bytes32 indexed name,
        address indexed oldAddress,
        address indexed newAddress,
        uint256 newVersion
    );
    
    event ContractDeactivated(bytes32 indexed name, address indexed contractAddress);
    event ContractReactivated(bytes32 indexed name, address indexed contractAddress);
    event CategoryCreated(bytes32 indexed category, string description);
    
    // Custom errors
    error ContractNotFound(bytes32 name);
    error ContractAlreadyExists(bytes32 name);
    error InvalidAddress();
    error InvalidVersion();
    error ContractInactive(bytes32 name);
    error CategoryNotFound(bytes32 category);
    
    constructor() {}
    
    /**
     * @dev Register a new contract
     */
    function registerContract(
        bytes32 name,
        address contractAddress,
        uint256 version,
        string calldata description,
        bytes32 category
    ) external onlyOwner {
        if (contractAddress == address(0)) revert InvalidAddress();
        if (version == 0) revert InvalidVersion();
        
        // Check if contract already exists
        if (_contracts[name].contractAddress != address(0)) {
            revert ContractAlreadyExists(name);
        }
        
        // Get code hash for verification
        bytes32 codeHash;
        assembly {
            codeHash := extcodehash(contractAddress)
        }
        
        // Register contract
        _contracts[name] = ContractInfo({
            contractAddress: contractAddress,
            version: version,
            deployedAt: block.timestamp,
            isActive: true,
            description: description,
            codeHash: codeHash
        });
        
        // Add to versions array
        _contractVersions[name].push(contractAddress);
        
        // Map address to name
        _addressToName[contractAddress] = name;
        
        // Add to all contracts list
        _allContractNames.push(name);
        
        // Set category
        if (category != bytes32(0)) {
            _contractCategories[name] = category;
            _categories[category].push(name);
        }
        
        emit ContractRegistered(name, contractAddress, version, description);
    }
    
    /**
     * @dev Update contract to new version
     */
    function updateContract(
        bytes32 name,
        address newAddress,
        uint256 newVersion,
        string calldata description
    ) external onlyOwner {
        if (newAddress == address(0)) revert InvalidAddress();
        if (_contracts[name].contractAddress == address(0)) revert ContractNotFound(name);
        if (newVersion <= _contracts[name].version) revert InvalidVersion();
        
        address oldAddress = _contracts[name].contractAddress;
        
        // Get new code hash
        bytes32 codeHash;
        assembly {
            codeHash := extcodehash(newAddress)
        }
        
        // Update contract info
        _contracts[name].contractAddress = newAddress;
        _contracts[name].version = newVersion;
        _contracts[name].deployedAt = block.timestamp;
        _contracts[name].description = description;
        _contracts[name].codeHash = codeHash;
        
        // Add to versions array
        _contractVersions[name].push(newAddress);
        
        // Update address mapping
        delete _addressToName[oldAddress];
        _addressToName[newAddress] = name;
        
        emit ContractUpdated(name, oldAddress, newAddress, newVersion);
    }
    
    /**
     * @dev Deactivate a contract
     */
    function deactivateContract(bytes32 name) external onlyOwner {
        if (_contracts[name].contractAddress == address(0)) revert ContractNotFound(name);
        
        _contracts[name].isActive = false;
        emit ContractDeactivated(name, _contracts[name].contractAddress);
    }
    
    /**
     * @dev Reactivate a contract
     */
    function reactivateContract(bytes32 name) external onlyOwner {
        if (_contracts[name].contractAddress == address(0)) revert ContractNotFound(name);
        
        _contracts[name].isActive = true;
        emit ContractReactivated(name, _contracts[name].contractAddress);
    }
    
    /**
     * @dev Create a new category
     */
    function createCategory(bytes32 category, string calldata description) external onlyOwner {
        require(category != bytes32(0), "Invalid category");
        
        _allCategories.push(category);
        emit CategoryCreated(category, description);
    }
    
    /**
     * @dev Get contract address by name
     */
    function getContract(bytes32 name) external view returns (address) {
        if (_contracts[name].contractAddress == address(0)) revert ContractNotFound(name);
        if (!_contracts[name].isActive) revert ContractInactive(name);
        
        return _contracts[name].contractAddress;
    }
    
    /**
     * @dev Get contract information
     */
    function getContractInfo(bytes32 name) external view returns (
        address contractAddress,
        uint256 version,
        uint256 deployedAt,
        bool isActive,
        string memory description,
        bytes32 codeHash
    ) {
        if (_contracts[name].contractAddress == address(0)) revert ContractNotFound(name);
        
        ContractInfo storage info = _contracts[name];
        return (
            info.contractAddress,
            info.version,
            info.deployedAt,
            info.isActive,
            info.description,
            info.codeHash
        );
    }
    
    /**
     * @dev Get contract name by address
     */
    function getContractName(address contractAddress) external view returns (bytes32) {
        return _addressToName[contractAddress];
    }
    
    /**
     * @dev Get all versions of a contract
     */
    function getContractVersions(bytes32 name) external view returns (address[] memory) {
        return _contractVersions[name];
    }
    
    /**
     * @dev Get contracts by category
     */
    function getContractsByCategory(bytes32 category) external view returns (bytes32[] memory) {
        return _categories[category];
    }
    
    /**
     * @dev Get contract category
     */
    function getContractCategory(bytes32 name) external view returns (bytes32) {
        return _contractCategories[name];
    }
    
    /**
     * @dev Get all contract names
     */
    function getAllContracts() external view returns (bytes32[] memory) {
        return _allContractNames;
    }
    
    /**
     * @dev Get all categories
     */
    function getAllCategories() external view returns (bytes32[] memory) {
        return _allCategories;
    }
    
    /**
     * @dev Get active contracts
     */
    function getActiveContracts() external view returns (bytes32[] memory) {
        uint256 activeCount = 0;
        
        // Count active contracts
        for (uint256 i = 0; i < _allContractNames.length; i++) {
            if (_contracts[_allContractNames[i]].isActive) {
                activeCount++;
            }
        }
        
        // Create array of active contracts
        bytes32[] memory activeContracts = new bytes32[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < _allContractNames.length; i++) {
            if (_contracts[_allContractNames[i]].isActive) {
                activeContracts[index] = _allContractNames[i];
                index++;
            }
        }
        
        return activeContracts;
    }
    
    /**
     * @dev Check if contract exists and is active
     */
    function isContractActive(bytes32 name) external view returns (bool) {
        return _contracts[name].contractAddress != address(0) && _contracts[name].isActive;
    }
    
    /**
     * @dev Verify contract code hash
     */
    function verifyContract(bytes32 name) external view returns (bool) {
        if (_contracts[name].contractAddress == address(0)) return false;
        
        bytes32 currentCodeHash;
        assembly {
            currentCodeHash := extcodehash(_contracts[name].contractAddress)
        }
        
        return currentCodeHash == _contracts[name].codeHash;
    }
    
    /**
     * @dev Batch register contracts
     */
    function batchRegisterContracts(
        bytes32[] calldata names,
        address[] calldata addresses,
        uint256[] calldata versions,
        string[] calldata descriptions,
        bytes32[] calldata categories
    ) external onlyOwner {
        require(
            names.length == addresses.length &&
            addresses.length == versions.length &&
            versions.length == descriptions.length &&
            descriptions.length == categories.length,
            "Array length mismatch"
        );
        
        for (uint256 i = 0; i < names.length; i++) {
            // Check if contract doesn't already exist
            if (_contracts[names[i]].contractAddress == address(0)) {
                registerContract(names[i], addresses[i], versions[i], descriptions[i], categories[i]);
            }
        }
    }
    
    /**
     * @dev Get registry statistics
     */
    function getRegistryStats() external view returns (
        uint256 totalContracts,
        uint256 activeContracts,
        uint256 totalCategories,
        uint256 totalVersions
    ) {
        totalContracts = _allContractNames.length;
        totalCategories = _allCategories.length;
        
        uint256 activeCount = 0;
        uint256 versionCount = 0;
        
        for (uint256 i = 0; i < _allContractNames.length; i++) {
            if (_contracts[_allContractNames[i]].isActive) {
                activeCount++;
            }
            versionCount += _contractVersions[_allContractNames[i]].length;
        }
        
        activeContracts = activeCount;
        totalVersions = versionCount;
    }
    
    /**
     * @dev Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Get contract addresses for multiple names
     */
    function getMultipleContracts(bytes32[] calldata names) external view returns (address[] memory) {
        address[] memory addresses = new address[](names.length);
        
        for (uint256 i = 0; i < names.length; i++) {
            if (_contracts[names[i]].contractAddress != address(0) && _contracts[names[i]].isActive) {
                addresses[i] = _contracts[names[i]].contractAddress;
            }
        }
        
        return addresses;
    }
}